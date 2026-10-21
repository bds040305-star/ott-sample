import { useEffect, useState } from 'react'
import { EXAMPLE_GAMES, loadGames, streamUrl } from '../features/sports/games'
import { GameChat } from '../features/sports/GameChat'
import './Sports.css'

const gameTime = game => game.date ? new Date(game.date).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '일정 예시'
const gameStatus = game => game.example ? '예시' : game.state === 'Live' ? 'LIVE' : game.state === 'Final' ? '경기 종료' : game.status === 'Scheduled' || game.status === 'Pre-Game' ? '경기 예정' : game.status

function Broadcast({ game }) {
  const [failed, setFailed] = useState(false)
  let stream = null
  try { stream = streamUrl(JSON.parse(import.meta.env.VITE_BASEBALL_STREAMS || '{}')[game.id]) } catch { /* No valid stream configuration. */ }
  return <div className="sports-player">
    {stream && !failed ? <iframe src={stream} title={`${game.away} 대 ${game.home} 공식 중계`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onError={() => setFailed(true)} /> : <div className="sports-player-empty">
      <span className="sports-baseball" aria-hidden="true">⚾</span>
      <span className="sports-eyebrow">BASEBALL CLUB</span>
      <h2>{game.example ? '야구를 즐기는 또 하나의 방법' : `${game.away} vs ${game.home}`}</h2>
      <p>{game.example ? '경기를 고르고, 함께 응원하고, 즐거운 순간을 나누세요.' : failed ? '중계 정보를 불러오지 못했습니다.' : '등록된 공식 중계 영상이 없습니다.'}</p>
      <span className="sports-player-note">{game.example ? '화면 예시 · 실제 생중계가 아닙니다' : '공식 사이트에서 중계 제공 여부와 시청 조건을 확인하세요.'}</span>
      <a className="sports-official-link" href="https://www.mlb.com/live-stream-games" target="_blank" rel="noopener noreferrer">MLB 공식 중계 보기 ↗</a>
      <small className="sports-stream-terms">새 탭에서 열립니다 · 로그인·구독 및 지역 제한이 적용될 수 있습니다.</small>
    </div>}
    <div className="sports-player-top"><span className={game.state === 'Live' ? 'sports-badge live' : 'sports-badge'}>{gameStatus(game)}</span><span>MLB · BASEBALL</span></div>
  </div>
}

export function Sports() {
  const [feed, setFeed] = useState({ games: [], loading: true, error: '', updated: null })
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let inFlight = false
    async function refresh() {
      if (inFlight) return
      inFlight = true
      try {
        const games = await loadGames(controller.signal)
        if (!controller.signal.aborted) setFeed({ games, loading: false, error: '', updated: new Date() })
      } catch (error) {
        if (!controller.signal.aborted) setFeed(previous => ({ ...previous, loading: false, error: error.name === 'TimeoutError' ? '경기 정보 응답이 지연되고 있습니다.' : '경기 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }))
      } finally { inFlight = false }
    }
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => { controller.abort(); clearInterval(interval) }
  }, [retry])

  const examples = !feed.loading && feed.games.length === 0
  const games = feed.loading ? [] : [...feed.games, ...EXAMPLE_GAMES.slice(0, Math.max(0, 6 - feed.games.length))]
  const selected = games.find(game => game.id === selectedId) || games[0]
  const visible = games.filter(game => filter === 'all' || (filter === 'live' ? game.state === 'Live' : !game.example && game.state === 'Preview'))
  const liveCount = feed.games.filter(game => game.state === 'Live').length

  return <main className="sports-page">
    <div className="sports-container">
      <div className="sports-page-heading"><div><p className="sports-eyebrow">PLAY TOGETHER. CHEER TOGETHER.</p><h1>스포츠 <span>LIVE</span></h1><p>오늘의 야구, 함께라서 더 뜨겁게.</p></div><a className="sports-league" href="https://www.mlb.com/live-stream-games" target="_blank" rel="noopener noreferrer">⚾ &nbsp; MLB 공식 중계 ↗</a></div>
      <div className="sports-feed-status" role="status">
        <span>{feed.loading ? '경기 일정을 불러오고 있습니다…' : feed.error ? `${feed.error} ${feed.games.length ? '마지막 수신 데이터를 표시합니다.' : '아래 6개 경기는 화면 예시입니다.'}` : examples ? '조회 기간에 경기가 없습니다. 아래 6개 경기는 화면 예시입니다.' : `진행 중 ${liveCount}경기 · 최근 및 예정 경기 ${feed.games.length}개`}</span>
        <button onClick={() => setRetry(value => value + 1)} aria-label="경기 정보 새로고침">↻ 새로고침</button>
      </div>
      {selected && <div className="sports-watch-layout">
        <section className="sports-watch" aria-label="선택한 경기 중계">
          <Broadcast key={selected.id} game={selected} />
          <div className="sports-match-info"><div><p>{selected.example ? '경기 화면 미리보기' : `${selected.venue} · ${gameTime(selected)} (한국 시간)`}</p><h2>{selected.away} <span>vs</span> {selected.home}</h2></div><div className="sports-main-score">{selected.awayScore ?? '–'} <span>:</span> {selected.homeScore ?? '–'}<small>{selected.inning ? `${selected.inning} ${selected.inningHalf === 'Top' ? '초' : '말'}` : gameStatus(selected)}</small></div></div>
        </section>
        <GameChat key={selected.id} game={selected} />
      </div>}
      <section className="sports-schedule" aria-labelledby="sports-schedule-title">
        <div className="sports-schedule-heading"><h2 id="sports-schedule-title">경기 센터 <span>{games.length.toString().padStart(2, '0')}</span></h2><p>MLB · 전후 7일 일정 · 한국 시간 기준</p></div>
        <div className="sports-filters" role="group" aria-label="경기 필터">{[['all', '전체 경기'], ['live', `진행 중 ${liveCount}`], ['upcoming', '예정 경기']].map(([value, label]) => <button key={value} aria-pressed={filter === value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}<span>{feed.updated ? `${feed.updated.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' })} 갱신 · 30초 간격` : '실제 경기 데이터 수신 대기'}</span></div>
        <div className="sports-games">{visible.map((game, index) => <button key={game.id} className={`sports-game-card ${selected?.id === game.id ? 'selected' : ''}`} onClick={() => setSelectedId(game.id)} aria-pressed={selected?.id === game.id}>
          <div className="sports-card-top"><span className={game.state === 'Live' ? 'sports-badge live' : 'sports-badge'}>{gameStatus(game)}</span><span>{gameTime(game)}</span></div>
          <div className="sports-team"><span className={`sports-team-icon team-${index % 3}`}>{game.away.slice(0, 1)}</span><strong>{game.away}</strong><b>{game.awayScore ?? '–'}</b></div>
          <div className="sports-team"><span className={`sports-team-icon team-${(index + 1) % 3}`}>{game.home.slice(0, 1)}</span><strong>{game.home}</strong><b>{game.homeScore ?? '–'}</b></div>
          <div className="sports-card-bottom"><span>{game.venue}</span><strong>{selected?.id === game.id ? '선택한 경기' : '경기 보기'} ↗</strong></div>
        </button>)}</div>
        {!feed.loading && visible.length === 0 && <p className="sports-no-games">{filter === 'live' ? '현재 진행 중인 경기가 없습니다.' : '표시할 예정 경기가 없습니다.'} 전체 경기에서 다른 경기를 확인해 주세요.</p>}
        <p className="sports-disclaimer">경기 데이터: MLB Stats API · 실제 경기 수와 일정은 시즌에 따라 달라집니다. 경기가 6개 미만이면 ‘예시’ 카드를 함께 표시합니다. 영상 제공 및 시청 가능 여부는 중계 권한과 지역에 따라 다릅니다.</p>
      </section>
    </div>
  </main>
}
