import { randomUUID } from 'node:crypto'

// One shared backend for all viewers, using server-sent events and HTTP POST.
export function createSportsChatMiddleware() {
  const rooms = new Map()
  const sessions = new Map()
  function json(res, code, data) {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(data))
  }
  function emit(room, event, data) {
    for (const client of room.clients) client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }
  function presence(room) { emit(room, 'presence', { count: new Set([...room.clients].map(client => client.uid)).size }) }
  return function sportsChat(req, res, next) {
    const url = new URL(req.url, 'http://localhost')
    if (!url.pathname.startsWith('/api/sports/')) return next()
    const match = url.pathname.match(/^\/api\/sports\/rooms\/([0-9]{1,12}|example-[0-5])\/(events|messages)$/)
    if (!match) return json(res, 404, { error: '응원방을 찾을 수 없습니다.' })
    if (req.headers.origin) {
      try { if (new URL(req.headers.origin).host !== req.headers.host) return json(res, 403, { error: '허용되지 않은 요청입니다.' }) } catch { return json(res, 403, { error: '허용되지 않은 요청입니다.' }) }
    }
    const now = Date.now()
    for (const [id, session] of sessions) if (now - session.seen > 86400000) sessions.delete(id)
    const cookie = req.headers.cookie?.match(/(?:^|;\s*)sports_session=([a-f0-9-]{36})(?:;|$)/)?.[1]
    let uid = cookie && sessions.has(cookie) ? cookie : null
    if (!uid) {
      if (sessions.size >= 10000) return json(res, 503, { error: '접속자가 많습니다. 잠시 후 다시 시도해 주세요.' })
      uid = randomUUID()
      sessions.set(uid, { seen: now, sent: 0, name: `야구팬 ${uid.slice(0, 4)}` })
      res.setHeader('Set-Cookie', `sports_session=${uid}; HttpOnly; SameSite=Strict; Path=/api/sports; Max-Age=86400${req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`)
    }
    const session = sessions.get(uid)
    session.seen = now
    let room = rooms.get(match[1])
    if (!room) {
      if (rooms.size >= 200) {
        const idle = [...rooms].find(([, value]) => value.clients.size === 0)
        if (!idle) return json(res, 503, { error: '응원방이 가득 찼습니다.' })
        rooms.delete(idle[0])
      }
      room = { clients: new Set(), messages: [] }
      rooms.set(match[1], room)
    }
    if (match[2] === 'events' && req.method === 'GET') {
      if ([...room.clients].filter(client => client.uid === uid).length >= 5 || room.clients.size >= 500) return json(res, 429, { error: '연결 수 제한을 초과했습니다.' })
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
      res.write(`retry: 3000\nevent: init\ndata: ${JSON.stringify({ uid, messages: room.messages })}\n\n`)
      const client = { res, uid }
      room.clients.add(client)
      presence(room)
      const heartbeat = setInterval(() => { session.seen = Date.now(); res.write(': heartbeat\n\n') }, 20000)
      res.on('close', () => { clearInterval(heartbeat); room.clients.delete(client); presence(room) })
      return
    }
    if (match[2] !== 'messages' || req.method !== 'POST') return json(res, 405, { error: '지원하지 않는 요청입니다.' })
    if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'JSON 요청이 필요합니다.' })
    let body = ''
    let rejected = false
    req.on('data', chunk => {
      if (rejected) return
      body += chunk
      if (Buffer.byteLength(body) > 4096) { rejected = true; json(res, 413, { error: '메시지가 너무 깁니다.' }) }
    })
    req.on('error', () => { if (!res.writableEnded) json(res, 400, { error: '요청을 읽을 수 없습니다.' }) })
    req.on('end', () => {
      if (rejected) return
      let data
      try { data = JSON.parse(body) } catch { return json(res, 400, { error: '잘못된 요청입니다.' }) }
      const text = typeof data.text === 'string' ? data.text.trim() : ''
      if (!text || text.length > 300) return json(res, 400, { error: '메시지는 1~300자로 입력해 주세요.' })
      if (now - session.sent < 1500) return json(res, 429, { error: '잠시 후에 다시 보내 주세요.' })
      session.sent = now
      const message = { id: randomUUID(), uid, name: session.name, text, createdAt: new Date().toISOString() }
      room.messages.push(message)
      if (room.messages.length > 100) room.messages.shift()
      emit(room, 'message', message)
      json(res, 201, { ok: true })
    })
  }
}

export function sportsChatPlugin() {
  const middleware = createSportsChatMiddleware()
  return {
    name: 'sports-chat',
    configureServer(server) { server.middlewares.use(middleware) },
    configurePreviewServer(server) { server.middlewares.use(middleware) },
  }
}
