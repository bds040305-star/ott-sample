import { useCallback, useEffect, useState } from 'react'
import { GameChat } from '../features/sports/GameChat'
import { LivePlayer } from '../features/sports/LivePlayer'
import './Sports.css'

const messages = {
  missing_key: 'YouTube 검색 키가 설정되지 않았습니다. 서버 환경 설정에 YOUTUBE_API_KEY가 필요합니다.',
  permission_denied: 'YouTube API 키 또는 API 사용 권한을 확인해 주세요.',
  quota_exceeded: 'YouTube API 조회 할당량을 초과했습니다. 할당량이 복구된 뒤 다시 시도해 주세요.',
  network_error: 'YouTube에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  channel_unavailable: 'WBSC 채널을 확인하지 못했습니다.',
  upstream_error: '라이브 검색 서비스에 일시적인 오류가 발생했습니다.',
}
async function getLive(params, signal) {
  const response = await fetch(`/api/live-baseball?${new URLSearchParams(params)}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]) })
  const result = await response.json()
  if (!response.ok) throw new Error(messages[result.error] || '라이브 정보를 불러오지 못했습니다.')
  return result
}
function viewersText(video) { return video.viewers === null ? '시청자 수 비공개' : `${new Intl.NumberFormat('ko-KR').format(video.viewers)}명 시청 중` }
function VideoCard({ video, selected, onSelect, rank }) {
  return <button className={`sports-game-card live-card ${selected ? 'selected' : ''}`} onClick={() => onSelect(video)} aria-pressed={selected}>
    <div className="live-thumbnail">{video.thumbnail && <img src={video.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" />}<span className="sports-badge live">LIVE</span>{rank && <b className="live-rank">{rank}</b>}</div>
    <h3>{video.title}</h3><p>{video.channelTitle}</p><div className="sports-card-bottom"><span>{viewersText(video)}</span><strong>{selected ? '선택한 방송' : '시청 · 채팅'} ↗</strong></div>
  </button>
}
function Watch({ video }) {
  const [state, setState] = useState('live')
  const [error, setError] = useState('')
  const onEnded = useCallback(() => setState('ended'), [])
  useEffect(() => {
    const controller = new AbortController()
    let busy = false
    async function check() {
      if (busy) return
      busy = true
      try {
        const result = await getLive({ videoId: video.id }, controller.signal)
        if (!controller.signal.aborted) { setState(result.videoState); setError('') }
      } catch (failure) { if (!controller.signal.aborted) setError(failure.message) }
      finally { busy = false }
    }
    check()
    const interval = setInterval(check, 300000)
    return () => { controller.abort(); clearInterval(interval) }
  }, [video.id])
  return <div className="sports-watch-layout">
    <section className="sports-watch" aria-label="선택한 야구 라이브">
      {state === 'live' ? <LivePlayer video={video} onEnded={onEnded} /> : <div className="sports-player sports-player-empty"><h2>{state === 'ended' ? '방송이 종료되었습니다.' : '이 방송은 현재 재생할 수 없습니다.'}</h2><a className="sports-official-link" href={video.originalUrl} target="_blank" rel="noopener noreferrer">YouTube 원본 확인 ↗</a></div>}
      <div className="sports-match-info"><div><p>{video.channelTitle} · {viewersText(video)}</p><h2>{video.title}</h2></div></div>
      {error && <p role="alert" className="live-inline-error">방송 상태 재확인 실패: {error}</p>}
    </section>
    <GameChat video={video} />
  </div>
}
function LiveContent({ channel }) {
  const [feed, setFeed] = useState({ data: null, loading: true, error: '' })
  const [picked, setPicked] = useState(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let inFlight = false
    async function refresh() {
      if (inFlight) return
      inFlight = true
      try {
        const data = await getLive({ channel }, controller.signal)
        if (!controller.signal.aborted) setFeed({ data, loading: false, error: '' })
      } catch (failure) { if (!controller.signal.aborted) setFeed(previous => ({ ...previous, loading: false, error: failure.name === 'TimeoutError' ? '라이브 검색 응답이 지연되고 있습니다.' : failure.message || '라이브 검색에 실패했습니다.' })) }
      finally { inFlight = false }
    }
    refresh()
    const interval = setInterval(refresh, 300000)
    return () => { controller.abort(); clearInterval(interval) }
  }, [channel, retry])
  const videos = feed.data?.videos || []
  const top = feed.data?.top || []
  const selected = videos.find(video => video.id === picked?.id) || picked || videos[0]
  return <>
    <div className="sports-feed-status" role="status"><span>{feed.loading ? '공개 야구 라이브를 검색하고 방송 상태를 확인하고 있습니다…' : feed.error ? `${feed.error}${feed.data ? ' 마지막 조회 결과를 표시합니다.' : ''}` : `검증된 공개 라이브 ${videos.length}개 · ${new Date(feed.data.checkedAt).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' })} 확인 (한국 시간)`}</span><button onClick={() => setRetry(n => n + 1)} disabled={feed.loading}>↻ 다시 확인</button></div>
    {!feed.loading && !feed.error && videos.length === 0 && <div className="live-empty"><span aria-hidden="true">⚾</span><h2>현재 확인된 야구 경기 라이브가 없습니다.</h2><p>진행 중인 공개·임베드 허용 방송만 표시합니다. 예시 영상으로 채우지 않습니다.</p></div>}
    {selected && <Watch key={selected.id} video={selected} />}
    <section className="sports-schedule" aria-labelledby="live-top-title"><div className="sports-schedule-heading"><h2 id="live-top-title">인기 TOP 5 <span>{top.length}개</span></h2><p>공개된 동시 시청자 수 기준</p></div>
      <div className="sports-games live-top-grid">{top.map((video, index) => <VideoCard key={video.id} video={video} rank={index + 1} selected={selected?.id === video.id} onSelect={setPicked} />)}</div>
      {!feed.loading && top.length === 0 && <p className="sports-no-games">시청자 수가 공개된 라이브가 없습니다.</p>}
    </section>
    <section className="sports-schedule" aria-labelledby="live-all-title"><div className="sports-schedule-heading"><h2 id="live-all-title">검색된 전체 라이브 <span>{videos.length}개</span></h2><p>비공개 시청자 수는 순위에서 제외</p></div><div className="sports-games">{videos.map(video => <VideoCard key={video.id} video={video} selected={selected?.id === video.id} onSelect={setPicked} />)}</div></section>
    <p className="sports-disclaimer">YouTube Data API v3 · 5분 캐시 및 자동 갱신 · {channel === 'wbsc' ? 'WBSC(@WBSC) 채널 내 baseball 검색' : 'baseball / 야구 검색'} · 검색 범위 최대 {feed.data?.searchCap || (channel === 'wbsc' ? 100 : 200)}개 후보 검증{feed.data?.searchLimited ? ' (추가 검색 결과가 있습니다)' : ''}.<br />공개·임베드 허용·실제 방송 시작·미종료 상태를 확인하고 게임·하이라이트·분석 등 명확한 비경기 콘텐츠를 제외합니다. 제목·설명만으로 중계 성격과 권리·지역별 실제 재생을 완전히 보장할 수는 없습니다. 시청자 수 비공개는 0명으로 표시하지 않습니다.</p>
  </>
}
export function Sports() {
  const [channel, setChannel] = useState('all')
  return <main className="sports-page"><div className="sports-container">
    <div className="sports-page-heading"><div><p className="sports-eyebrow">PLAY TOGETHER. CHEER TOGETHER.</p><h1>스포츠 <span>LIVE</span></h1><p>실제 야구 라이브를 찾고, 같은 경기를 함께 응원하세요.</p></div><a className="sports-league" href="https://www.youtube.com/@WBSC" target="_blank" rel="noopener noreferrer">WBSC 채널 ↗</a></div>
    <div className="sports-filters" role="group" aria-label="라이브 채널 필터"><button aria-pressed={channel === 'all'} className={channel === 'all' ? 'active' : ''} onClick={() => setChannel('all')}>전체 야구</button><button aria-pressed={channel === 'wbsc'} className={channel === 'wbsc' ? 'active' : ''} onClick={() => setChannel('wbsc')}>WBSC 공식 야구</button></div>
    <LiveContent key={channel} channel={channel} />
  </div></main>
}
