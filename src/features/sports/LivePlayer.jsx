import { useEffect, useRef, useState } from 'react'
let apiPromise
function loadPlayerApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromise) apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(window.YT) }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.onerror = () => { apiPromise = null; reject(new Error('player_unavailable')) }
    document.head.appendChild(script)
  })
  return apiPromise
}
export function LivePlayer({ video, onEnded }) {
  const host = useRef(null)
  const [state, setState] = useState('loading')
  useEffect(() => {
    let disposed = false
    let player
    const timeout = setTimeout(() => { if (!disposed) setState('timeout') }, 20000)
    loadPlayerApi().then(YT => {
      if (disposed) return
      const container = document.createElement('div')
      host.current.appendChild(container)
      player = new YT.Player(container, {
        width: '100%', height: '100%', videoId: video.id,
        playerVars: { origin: window.location.origin, playsinline: 1, autoplay: 0 },
        events: {
          onReady() { clearTimeout(timeout); if (!disposed) setState('ready') },
          onStateChange(event) {
            if (disposed) return
            if (event.data === 1) setState('playing')
            if (event.data === 0) { setState('ended'); onEnded(video.id) }
          },
          onError(event) { clearTimeout(timeout); if (!disposed) setState(event.data === 100 ? 'unavailable' : [101, 150].includes(event.data) ? 'embed_denied' : 'playback_error') },
        },
      })
    }).catch(() => { clearTimeout(timeout); if (!disposed) setState('playback_error') })
    return () => { disposed = true; clearTimeout(timeout); player?.destroy() }
  }, [video.id, onEnded])
  const errors = { timeout: '플레이어 응답이 지연됩니다. 원본 영상에서 확인해 주세요.', ended: '방송이 종료되었습니다.', unavailable: '영상이 삭제되었거나 시청할 수 없습니다.', embed_denied: '이 방송은 외부 재생이 제한됩니다.', playback_error: '영상을 재생할 수 없습니다. 원본 영상에서 시청 조건을 확인해 주세요.' }
  return <><div className="sports-player live-player"><div ref={host} className="youtube-player-host" />{state === 'loading' && <p className="live-player-status">플레이어를 불러오는 중…</p>}</div><p className="live-playback-status" role="status">{errors[state] || (state === 'playing' ? '재생 중' : state === 'ready' ? '재생 버튼을 눌러 시청하세요.' : '')} <a href={video.originalUrl} target="_blank" rel="noopener noreferrer">YouTube 원본 영상 ↗</a></p></>
}
