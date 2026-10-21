import { test } from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/baseball.js'

function response() {
  return { code: 200, headers: {}, status(value) { this.code = value; return this }, setHeader(key, value) { this.headers[key] = value }, json(value) { this.body = value; return this } }
}

test('Vercel MLB endpoint validates requests and handles upstream errors', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  try {
    globalThis.fetch = async url => { calls++; assert.equal(new URL(url).hostname, 'statsapi.mlb.com'); return { ok: true, json: async () => ({ dates: [{ date: '2026-10-21', games: [] }] }) } }
    for (const req of [{ method: 'POST', query: {} }, { method: 'GET', query: { startDate: 'invalid', endDate: '2026-10-21' } }, { method: 'GET', query: { startDate: '2026-01-01', endDate: '2026-12-31' } }]) {
      const res = response(); await handler(req, res); assert.ok(res.code >= 400)
    }
    assert.equal(calls, 0)
    const req = { method: 'GET', query: { startDate: '2026-10-14', endDate: '2026-10-28' } }
    const res = response(); await handler(req, res)
    assert.equal(res.code, 200); assert.equal(res.body.dates.length, 1); assert.match(res.headers['Cache-Control'], /s-maxage=15/)
    globalThis.fetch = async () => ({ ok: false })
    const failed = response(); await handler(req, failed); assert.equal(failed.code, 502)
    globalThis.fetch = async () => { throw new Error('Network failure') }
    const unavailable = response(); await handler(req, unavailable); assert.equal(unavailable.code, 502)
  } finally { globalThis.fetch = originalFetch }
})
