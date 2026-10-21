export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const start = String(req.query.startDate || '')
  const end = String(req.query.endDate || '')
  const pattern = /^\d{4}-\d{2}-\d{2}$/
  const span = Date.parse(end) - Date.parse(start)
  if (!pattern.test(start) || !pattern.test(end) || !Number.isFinite(span) || span < 0 || span > 31 * 86400000) return res.status(400).json({ error: 'Invalid date range' })
  const params = new URLSearchParams({ sportId: '1', startDate: start, endDate: end, hydrate: 'linescore' })
  try {
    const response = await fetch(`https://statsapi.mlb.com/api/v1/schedule?${params}`, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) return res.status(502).json({ error: 'MLB schedule unavailable' })
    const payload = await response.json()
    if (!Array.isArray(payload.dates)) return res.status(502).json({ error: 'Invalid MLB schedule' })
    res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=15')
    return res.status(200).json(payload)
  } catch { return res.status(502).json({ error: 'MLB schedule unavailable' }) }
}
