import { getLive, LiveError } from './youtubeLive.js'
try {
  const all = await getLive()
  const wbsc = await getLive({ channel: 'wbsc' })
  console.log(JSON.stringify({ result: 'api_verified', checkedAt: all.checkedAt, liveCount: all.videos.length, rankedCount: all.top.length, wbscLiveCount: wbsc.videos.length, playbackVerified: false }))
} catch (error) {
  console.log(JSON.stringify({ result: 'blocked', code: error instanceof LiveError ? error.code : 'unexpected_error', playbackVerified: false }))
  process.exitCode = 1
}
