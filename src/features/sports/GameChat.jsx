import { useEffect, useRef, useState } from 'react'
import { connectChat } from './chatTransport'

export function GameChat({ game }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [status, setStatus] = useState('connecting')
  const [uid, setUid] = useState(null)
  const [viewers, setViewers] = useState(0)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const end = useRef(null)
  const connection = useRef(null)
  useEffect(() => {
    const chat = connectChat(game.id, {
      init(data) { setUid(data.uid); setMessages(data.messages); setStatus('connected') },
      message(message) { setMessages(previous => previous.some(item => item.id === message.id) ? previous : [...previous, message].slice(-100)) },
      presence: setViewers,
      error() { setStatus('error') },
    })
    connection.current = chat
    return () => { chat.close(); connection.current = null }
  }, [game.id])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [messages])
  async function send(event) {
    event.preventDefault()
    const body = text.trim()
    if (!body || body.length > 300 || sending || status !== 'connected') return
    setSending(true)
    setSendError('')
    try {
      await connection.current.send(body)
      setText('')
    } catch (error) { setSendError(error.message || '연결 상태를 확인하고 다시 시도해 주세요.') }
    finally { setSending(false) }
  }
  const connected = status === 'connected'
  return <aside className="sports-chat" aria-label="경기별 실시간 채팅">
    <div className="sports-chat-heading"><h2>같이 응원해요 <span>LIVE CHAT</span></h2><span className={connected ? 'chat-connected' : 'chat-offline'}>{connected ? viewers === null ? '● 채팅 연결됨' : `● ${viewers}명 접속` : '○ 미연결'}</span></div>
    <p className="sports-chat-room">{game.away} vs {game.home}</p>
    <div className="sports-messages" role="log" aria-live="polite" aria-relevant="additions">
      <p className="chat-notice">서로 존중하며 함께 응원해 주세요. 개인정보는 남기지 마세요.{game.example && ' 이 방은 예시 경기의 실제 채팅방입니다.'}</p>
      {status === 'connecting' && <p className="chat-empty">응원방에 연결하고 있습니다…</p>}
      {status === 'error' && <p role="alert" className="chat-empty">연결이 끊겼습니다. 자동으로 재연결합니다.<br />채팅 서버 실행 상태를 확인해 주세요.</p>}
      {connected && messages.length === 0 && <p className="chat-empty">아직 메시지가 없어요.<br />첫 응원을 남겨보세요! ⚾</p>}
      {messages.map(message => <div className={`chat-message ${message.uid === uid ? 'is-mine' : ''}`} key={message.id}>
        <div><strong>{message.name}</strong><time>{new Date(message.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</time></div><p>{message.text}</p>
      </div>)}<div ref={end} />
    </div>
    <form onSubmit={send} className="sports-chat-form"><label className="sr-only" htmlFor="sports-message">응원 메시지</label>
      <div><input id="sports-message" placeholder="응원 메시지를 입력하세요" maxLength={300} value={text} onChange={event => setText(event.target.value)} disabled={!connected || sending} autoComplete="off" /><button disabled={!connected || !text.trim() || sending} type="submit" aria-label="메시지 전송">{sending ? '…' : '↑'}</button></div>
      <small>{text.length}/300 · 게스트 참여 · Enter로 전송</small>{sendError && <p role="alert">{sendError}</p>}
    </form>
  </aside>
}
