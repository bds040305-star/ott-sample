import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { extname, resolve, sep } from 'node:path'
import { createSportsChatMiddleware } from './sportsChat.js'

const root = fileURLToPath(new URL('../dist/', import.meta.url))
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.zip': 'application/zip' }
const chat = createSportsChatMiddleware()
const server = createServer((req, res) => {
  chat(req, res, async () => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return }
    let path
    try { path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)) } catch { res.writeHead(400); res.end(); return }
    if (path !== resolve(root) && !path.startsWith(resolve(root) + sep)) { res.writeHead(403); res.end(); return }
    try {
      if (!(await stat(path)).isFile()) path = resolve(root, 'index.html')
    } catch { path = resolve(root, 'index.html') }
    try {
      await stat(path)
      res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' })
      if (req.method === 'HEAD') res.end()
      else createReadStream(path).on('error', () => res.destroy()).pipe(res)
    } catch { res.writeHead(503); res.end('Build the app with npm run build first.') }
  })
})
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log(`Sports app listening on port ${server.address().port}`))
