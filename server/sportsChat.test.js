import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createSportsChatMiddleware } from './sportsChat.js'

test('independent viewers receive messages, rooms stay isolated, presence updates and input is validated', async () => {
  const middleware = createSportsChatMiddleware()
  const server = createServer((req, res) => middleware(req, res, () => { res.writeHead(404); res.end() }))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}/api/sports/rooms`
  const streams = []
  async function connect(room) {
    const controller = new AbortController()
    streams.push(controller)
    const response = await fetch(`${base}/${room}/events`, { signal: controller.signal })
    assert.equal(response.status, 200)
    const reader = response.body.getReader()
    let pending = ''
    const client = { cookie: response.headers.get('set-cookie').split(';')[0], controller, async event(type) {
      const deadline = setTimeout(() => controller.abort(), 3000)
      try {
        while (true) {
          const index = pending.indexOf('\n\n')
          if (index >= 0) {
            const block = pending.slice(0, index)
            pending = pending.slice(index + 2)
            if (block.includes(`event: ${type}\n`)) return JSON.parse(block.match(/data: (.*)/)[1])
          } else {
            const { value, done } = await reader.read()
            if (done) throw new Error('Stream ended before expected event')
            pending += new TextDecoder().decode(value)
          }
        }
      } finally { clearTimeout(deadline) }
    } }
    client.init = await client.event('init')
    return client
  }
  const post = (room, cookie, text) => fetch(`${base}/${room}/messages`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
  try {
    const first = await connect('123')
    assert.equal((await first.event('presence')).count, 1)
    const second = await connect('123')
    assert.notEqual(first.init.uid, second.init.uid)
    assert.equal((await first.event('presence')).count, 2)
    assert.equal((await second.event('presence')).count, 2)
    const other = await connect('456')
    assert.deepEqual(other.init.messages, [])
    assert.equal((await post('123', first.cookie, '함께 응원해요! <script>')).status, 201)
    assert.equal((await first.event('message')).text, '함께 응원해요! <script>')
    assert.equal((await second.event('message')).text, '함께 응원해요! <script>')
    assert.equal((await post('123', first.cookie, '도배')).status, 429)
    assert.equal((await post('123', second.cookie, ' ')).status, 400)
    assert.equal((await post('123', second.cookie, 'a'.repeat(301))).status, 400)
    const reconnect = await connect('123')
    assert.equal(reconnect.init.messages.length, 1)
    const isolated = await connect('456')
    assert.deepEqual(isolated.init.messages, [])
    const forbidden = await fetch(`${base}/123/messages`, { method: 'POST', headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' }, body: '{"text":"bad"}' })
    assert.equal(forbidden.status, 403)
    second.controller.abort()
    // First sees a third viewer join, then the second viewer leave.
    assert.equal((await first.event('presence')).count, 3)
    assert.equal((await first.event('presence')).count, 2)
  } finally {
    streams.forEach(stream => stream.abort())
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
})
