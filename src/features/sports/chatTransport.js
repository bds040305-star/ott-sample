import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../firebase/firebase'

export function connectChat(videoId, user, callbacks) {
  if (!user || !/^[\w-]{11}$/.test(videoId)) throw new Error('로그인이 필요합니다.')
  const messages = collection(db, 'liveBaseballRooms', videoId, 'messages')
  const unsubscribe = onSnapshot(query(messages, orderBy('createdAt', 'desc'), limit(100)), snapshot => {
    callbacks.init({ uid: user.uid, messages: snapshot.docs.map(item => {
      const data = item.data({ serverTimestamps: 'estimate' })
      return { ...data, id: item.id, pending: item.metadata.hasPendingWrites, createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString() }
    }).reverse() })
  }, callbacks.error)
  let lastSent = 0
  return {
    close: unsubscribe,
    async send(text) {
      if (auth.currentUser?.uid !== user.uid) throw new Error('로그인 상태가 변경되었습니다. 다시 로그인해 주세요.')
      if (!text.trim() || text.length > 300) throw new Error('메시지는 1~300자로 입력해 주세요.')
      if (Date.now() - lastSent < 1500) throw new Error('잠시 후 다시 보내 주세요.')
      lastSent = Date.now()
      await addDoc(messages, { uid: user.uid, name: (user.displayName || '야구팬').slice(0, 40), text: text.trim(), createdAt: serverTimestamp() })
    },
  }
}
