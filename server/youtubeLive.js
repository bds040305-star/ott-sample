const TTL = 300000
export class LiveError extends Error {
  constructor(code, status = 502) { super(code); this.code = code; this.status = status }
}
const excluded = /diferido|diferida|rebroadcast|retransmisi[oó]n|repetici[oó]n|narraci[oó]n|sportscards|sports[ -]?cards|livebreaks?|\bbreaks?\b|actionsims|\bsims?\b|monster\s*jam|baseball\s*5|sports\s*complex|baseball\s*field\s*\d|webcam|카드\s*깡|카드\s*개봉|🎙|gameplay|simulation|simulator|mlb\s*(the\s*)?show|\bthe show\s*\d*|\b(?:ootp|ps5|ps4|xbox|esports|e-sports)\b|highlights?|watch[ -]?along|commentary|analysis|predictions?|play[ -]?by[ -]?play|live\s*(?:score|reaction|chat)|scoreboard|radio|audio[ -]?only|replay|rebroadcast|하이라이트|시뮬레|게임\s*플레이|컴투스|마구마구|프로야구스피리츠|9\s*innings|입중계|문자\s*중계|해설|분석|재방송|다시\s*보기|스코어보드|예측|ソフトボール|softball|소프트볼/i
export function inspectVideo(video, now = Date.now()) {
  const details = video.liveStreamingDetails || {}
  if (details.actualEndTime) return 'ended'
  if (video.status?.privacyStatus !== 'public' || video.status?.embeddable !== true) return 'unavailable'
  if (!details.actualStartTime || Date.parse(details.actualStartTime) > now || video.snippet?.liveBroadcastContent !== 'live') return 'not_live'
  if (video.snippet?.categoryId === '20' || excluded.test(`${video.snippet?.title || ''} ${(video.snippet?.description || '').slice(0, 1000)}`)) return 'excluded'
  const region = video.contentDetails?.regionRestriction
  if (region?.blocked?.includes('KR') || (region?.allowed && !region.allowed.includes('KR'))) return 'region_blocked'
  return 'live'
}
export function normalizeVideo(video) {
  const raw = video.liveStreamingDetails.concurrentViewers
  const viewers = raw != null && /^\d+$/.test(String(raw)) ? Number(raw) : null
  return {
    id: video.id, title: video.snippet.title, channelTitle: video.snippet.channelTitle,
    channelId: video.snippet.channelId, viewers: Number.isSafeInteger(viewers) ? viewers : null,
    thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url || null,
    startedAt: video.liveStreamingDetails.actualStartTime,
    originalUrl: `https://www.youtube.com/watch?v=${video.id}`,
  }
}
export function createLiveService({ fetcher = fetch, getKey = () => process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY, clock = Date.now } = {}) {
  const cache = new Map()
  const pending = new Map()
  async function youtube(resource, params, key) {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`)
    url.search = new URLSearchParams({ ...params, key }).toString()
    let response
    try { response = await fetcher(url, { signal: AbortSignal.timeout(12000) }) } catch { throw new LiveError('network_error') }
    let data
    try { data = await response.json() } catch { throw new LiveError('upstream_error') }
    if (!response.ok) {
      const reason = data.error?.errors?.[0]?.reason
      if (['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded'].includes(reason)) throw new LiveError('quota_exceeded', 429)
      if (response.status === 401 || response.status === 403 || response.status === 400) throw new LiveError('permission_denied', 403)
      throw new LiveError('upstream_error')
    }
    return data
  }
  async function retrieve({ channel, videoId }, key) {
    let wbscChannelId = null
    let ids
    let limited = false
    if (videoId) ids = [videoId]
    else {
      if (channel === 'wbsc') {
        const channelResult = await youtube('channels', { part: 'id,snippet', forHandle: 'WBSC' }, key)
        wbscChannelId = channelResult.items?.[0]?.id
        if (!wbscChannelId) throw new LiveError('channel_unavailable', 404)
      }
      const searches = await Promise.all((channel === 'wbsc' ? ['baseball'] : ['baseball', '야구']).map(async q => {
        const found = []
        let pageToken
        for (let page = 0; page < 2; page++) {
          const data = await youtube('search', {
            part: 'snippet', q, type: 'video', eventType: 'live', videoEmbeddable: 'true',
            order: 'viewCount', maxResults: '50', regionCode: 'KR',
            ...(wbscChannelId ? { channelId: wbscChannelId } : {}), ...(pageToken ? { pageToken } : {}),
          }, key)
          found.push(...(data.items || []).map(item => item.id?.videoId).filter(Boolean))
          pageToken = data.nextPageToken
          if (!pageToken) break
          if (page === 1) limited = true
        }
        return found
      }))
      ids = [...new Set(searches.flat())]
    }
    const checked = []
    for (let offset = 0; offset < ids.length; offset += 50) {
      const data = await youtube('videos', { part: 'snippet,status,liveStreamingDetails,contentDetails', id: ids.slice(offset, offset + 50).join(',') }, key)
      checked.push(...(data.items || []))
    }
    const videos = checked.filter(video => inspectVideo(video, clock()) === 'live' && (!wbscChannelId || video.snippet.channelId === wbscChannelId)).map(normalizeVideo)
    videos.sort((a, b) => (b.viewers ?? -1) - (a.viewers ?? -1) || a.id.localeCompare(b.id))
    return {
      videos, top: videos.filter(video => video.viewers !== null).slice(0, 5),
      checkedAt: new Date(clock()).toISOString(), expiresAt: new Date(clock() + TTL).toISOString(),
      channel, wbscChannelId, searchLimited: limited, searchCap: channel === 'wbsc' ? 100 : 200,
      ...(videoId ? { videoState: checked[0] ? inspectVideo(checked[0], clock()) : 'unavailable' } : {}),
    }
  }
  return async function getLive({ channel = 'all', videoId = '' } = {}) {
    if (!['all', 'wbsc'].includes(channel) || (videoId && !/^[\w-]{11}$/.test(videoId))) throw new LiveError('invalid_request', 400)
    const key = getKey()
    if (!key) throw new LiveError('missing_key', 503)
    const cacheKey = `${key}:${channel}:${videoId}`
    const saved = cache.get(cacheKey)
    if (saved && saved.until > clock()) return saved.data
    if (pending.has(cacheKey)) return pending.get(cacheKey)
    const task = retrieve({ channel, videoId }, key).then(data => {
      if (cache.size >= 100) cache.delete(cache.keys().next().value)
      cache.set(cacheKey, { data, until: clock() + TTL }); return data
    }).finally(() => pending.delete(cacheKey))
    pending.set(cacheKey, task)
    return task
  }
}
export const getLive = createLiveService()
export async function liveHandler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })
  try {
    const data = await getLive({ channel: req.query?.channel || 'all', videoId: req.query?.videoId || '' })
    res.setHeader('Cache-Control', 'public, s-maxage=300, max-age=0')
    return res.status(200).json(data)
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(error instanceof LiveError ? error.status : 502).json({ error: error instanceof LiveError ? error.code : 'upstream_error' })
  }
}
export function liveMiddleware(req, res, next) {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname !== '/api/live-baseball') return next()
  req.query = Object.fromEntries(url.searchParams)
  res.status = code => { res.statusCode = code; return res }
  res.json = data => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)) }
  return liveHandler(req, res)
}
export function livePlugin() {
  return { name: 'baseball-live-api', configureServer(server) { server.middlewares.use(liveMiddleware) }, configurePreviewServer(server) { server.middlewares.use(liveMiddleware) } }
}
