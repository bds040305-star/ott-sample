import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../firebase/firebase'

const firebaseTransport = import.meta.env.VITE_CHAT_TRANSPORT === 'firestore'

export function connectChat(roomId, callbacks) {
  if (!firebaseTransport) {
    const base = `/api/sports/rooms/${roomId}`
    const events = new EventSource(`${base}/events`)
    events.addEventListener('init', event => callbacks.init(JSON.parse(event.data)))
    events.addEventListener('message', event => callbacks.message(JSON.parse(event.data)))
    events.addEventListener('presence', event => callbacks.presence(JSON.parse(event.data).count))
    events.onerror = callbacks.error
    return {
      close: () => events.close(),
      async send(text) {
        const response = await fetch(`${base}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || '메시지 전송에 실패했습니다.')
      },
    }
  }
  let uid
  try {
    uid = localStorage.getItem('sports-guest-id') || crypto.randomUUID()
    localStorage.setItem('sports-guest-id', uid)
  } catch { uid = crypto.randomUUID() }
  const name = `야구팬 ${uid.slice(0, 4)}`
  const messages = query(collection(db, 'sportsRooms', roomId, 'messages'), orderBy('createdAt', 'desc'), limit(100))
  const presenceRef = doc(db, 'sportsRooms', roomId, 'presence', crypto.randomUUID())
  let viewers = []
  let closed = false
  let lastSent = 0
  const updateCount = () => callbacks.presence(new Set(viewers.filter(item => item.seen > Date.now() - 90000).map(item => item.uid)).size)
  const unsubscribeMessages = onSnapshot(messages, snapshot => {
    callbacks.init({ uid, messages: snapshot.docs.map(item => {
      const data = item.data({ serverTimestamps: 'estimate' })
      return { ...data, id: item.id, createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString() }
    }).reverse() })
  }, callbacks.error)
  const unsubscribePresence = onSnapshot(query(collection(db, 'sportsRooms', roomId, 'presence'), orderBy('seenAt', 'desc'), limit(500)), snapshot => {
    viewers = snapshot.docs.map(item => { const data = item.data({ serverTimestamps: 'estimate' }); return { uid: data.uid, seen: data.seenAt?.toMillis?.() || 0 } })
    updateCount()
  }, () => callbacks.presence(null))
  const heartbeat = () => {
    if (closed) return
    setDoc(presenceRef, { uid, seenAt: serverTimestamp() }).then(() => { if (closed) deleteDoc(presenceRef).catch(() => {}) }).catch(() => { if (!closed) callbacks.presence(null) })
    updateCount()
  }
  heartbeat()
  const interval = setInterval(heartbeat, 30000)
  return {
    close() { closed = true; clearInterval(interval); unsubscribeMessages(); unsubscribePresence(); deleteDoc(presenceRef).catch(() => {}) },
    async send(text) {
      if (!text.trim() || text.length > 300) throw new Error('메시지는 1~300자로 입력해 주세요.')
      if (Date.now() - lastSent < 1500) throw new Error('잠시 후 다시 보내 주세요.')
      lastSent = Date.now()
      await addDoc(collection(db, 'sportsRooms', roomId, 'messages'), { uid, name, text: text.trim(), createdAt: serverTimestamp() })
    },
  }
}
