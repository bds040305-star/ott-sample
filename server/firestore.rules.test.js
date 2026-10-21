import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, doc, getDocs, onSnapshot, serverTimestamp, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

test('emulator: two authenticated viewers, live delivery, isolation and UID security', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
 const fragment=await readFile(new URL('../firebase/live-baseball.rules.fragment',import.meta.url),'utf8')
 const env=await initializeTestEnvironment({projectId:'demo-ott-sports',firestore:{rules:`rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { ${fragment} } }`}})
 try{
  const alice=env.authenticatedContext('alice').firestore(),bob=env.authenticatedContext('bob').firestore(),guest=env.unauthenticatedContext().firestore()
  const path='liveBaseballRooms/AAAAAAAAAAA/messages/one'
  const message={uid:'alice',name:'Alice',text:'응원합니다',createdAt:serverTimestamp()}
  await assertFails(setDoc(doc(guest,path),message))
  await assertFails(setDoc(doc(bob,path),message))
  await assertFails(getDocs(collection(guest,'liveBaseballRooms/AAAAAAAAAAA/messages')))
  const delivered=new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{stop();reject(Error('No realtime message delivered'))},5000)
   const stop=onSnapshot(collection(bob,'liveBaseballRooms/AAAAAAAAAAA/messages'),snapshot=>{if(snapshot.docs.some(d=>d.id==='one')){clearTimeout(timer);stop();resolve(snapshot.docs[0].data())}},reject)
  })
  await assertSucceeds(setDoc(doc(alice,path),message));assert.equal((await delivered).uid,'alice')
  assert.equal((await getDocs(collection(bob,'liveBaseballRooms/BBBBBBBBBBB/messages'))).size,0)
  await assertFails(setDoc(doc(alice,'liveBaseballRooms/AAAAAAAAAAA/messages/long'),{...message,text:'a'.repeat(301)}))
  await assertFails(setDoc(doc(alice,'liveBaseballRooms/AAAAAAAAAAA/messages/time'),{...message,createdAt:new Date(0)}))
  await assertFails(setDoc(doc(alice,'liveBaseballRooms/AAAAAAAAAAA/messages/extra'),{...message,admin:true}))
  await assertFails(updateDoc(doc(alice,path),{text:'changed'}))
  await assertFails(deleteDoc(doc(alice,path)))
  await assertSucceeds(setDoc(doc(bob,'liveBaseballRooms/BBBBBBBBBBB/messages/two'),{...message,uid:'bob',name:'Bob'}))
  assert.equal((await getDocs(collection(alice,'liveBaseballRooms/AAAAAAAAAAA/messages'))).size,1)
 }finally{await env.cleanup()}
})
