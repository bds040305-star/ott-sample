import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { Link } from 'react-router-dom'
import { auth } from '../../firebase/firebase'
import { connectChat } from './chatTransport'

function AuthenticatedChat({ video, user }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [status, setStatus] = useState('connecting')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [retry, setRetry] = useState(0)
  const end = useRef(null)
  const connection = useRef(null)
  useEffect(() => {
    let active = true
    const chat = connectChat(video.id, user, {
      init(data) { if (active) { setMessages(data.messages); setStatus('connected') } },
      error(error) { if (active) setStatus(error.code === 'permission-denied' ? 'permission' : 'error') },
    })
    connection.current = chat
    return () => { active = false; chat.close(); connection.current = null }
  }, [video.id, user, retry])
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }) }, [messages])
  async function send(event) {
    event.preventDefault()
    const body = text.trim()
    if (!body || sending || status !== 'connected') return
    setSending(true)
    setSendError('')
    try { await connection.current.send(body); setText('') }
    catch (error) { setSendError(error.code === 'permission-denied' ? '메시지 작성 권한이 없습니다. Firebase 보안 규칙을 확인해 주세요.' : error.message || '전송에 실패했습니다. 다시 시도해 주세요.') }
    finally { setSending(false) }
  }
  return <>
    <div className="sports-messages" role="log" aria-live="polite" aria-relevant="additions">
      <p className="chat-notice">같은 방송을 보는 회원들의 대화방입니다. 서로 존중하며 개인정보는 남기지 마세요.</p>
      {status === 'connecting' && <p className="chat-empty">응원방 연결 중…</p>}
      {(status === 'error' || status === 'permission') && <p role="alert" className="chat-empty">{status === 'permission' ? '채팅 읽기 권한이 없습니다. Firebase 보안 규칙 확인이 필요합니다.' : '채팅 연결에 실패했습니다.'}<br /><button onClick={() => setRetry(n => n + 1)}>다시 연결</button></p>}
      {status === 'connected' && messages.length === 0 && <p className="chat-empty">첫 응원을 남겨보세요! ⚾</p>}
      {messages.map(message => <div className={`chat-message ${message.uid === user.uid ? 'is-mine' : ''}`} key={message.id}>
        <div><strong>{message.name}</strong><time>{message.pending ? '전송 중' : new Date(message.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</time></div><p>{message.text}</p>
      </div>)}<div ref={end} />
    </div>
    <form onSubmit={send} className="sports-chat-form"><label className="sr-only" htmlFor="sports-message">응원 메시지</label>
      <div><input id="sports-message" placeholder="응원 메시지를 입력하세요" maxLength={300} value={text} onChange={event => setText(event.target.value)} disabled={status !== 'connected' || sending} autoComplete="off" /><button disabled={status !== 'connected' || !text.trim() || sending} type="submit" aria-label="메시지 전송">{sending ? '…' : '↑'}</button></div>
      <small>{text.length}/300 · {sending ? '전송 중' : '로그인 회원 전용 · Enter로 전송'}</small>{sendError && <p role="alert">{sendError}</p>}
    </form>
  </>
}
export function GameChat({ video }) {
  const [user, setUser] = useState(auth.currentUser)
  useEffect(() => onAuthStateChanged(auth, setUser), [])
  return <aside className="sports-chat" aria-label="방송별 회원 채팅">
    <div className="sports-chat-heading"><h2>같이 응원해요 <span>MEMBERS CHAT</span></h2><span className="chat-connected">{user ? '회원 채팅' : '로그인 필요'}</span></div>
    <p className="sports-chat-room">{video.title}</p>
    {user ? <AuthenticatedChat key={`${video.id}:${user.uid}`} video={video} user={user} /> : <div className="sports-messages"><p className="chat-empty">같은 방송을 보는 회원들과<br />함께 응원해 보세요.</p><p className="chat-login"><Link to="/login" state={{ from: '/sports' }}>기존 Google 계정으로 로그인</Link></p></div>}
  </aside>
}
