import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLiveService, inspectVideo, liveHandler } from './youtubeLive.js'
const now = Date.parse('2026-10-21T06:00:00Z')
const video = (id, title = 'LIVE Baseball Japan vs Korea', viewers = '100') => ({ id, snippet: { title, description: '', categoryId: '17', liveBroadcastContent: 'live', channelId: 'official-wbsc', channelTitle: 'WBSC', thumbnails: {} }, status: { privacyStatus: 'public', embeddable: true }, liveStreamingDetails: { actualStartTime: '2026-10-21T05:00:00Z', ...(viewers === null ? {} : { concurrentViewers: viewers }) } })
const response = data => ({ ok: true, json: async () => data })
test('only real started public embeddable live candidates; unknown audience is not zero', async () => {
  const a = video('AAAAAAAAAAA', undefined, '500'); const b = video('BBBBBBBBBBB', undefined, null)
  const ended = video('CCCCCCCCCCC'); ended.liveStreamingDetails.actualEndTime = '2026-10-21T05:10:00Z'
  const privateVideo = video('DDDDDDDDDDD'); privateVideo.status.privacyStatus = 'private'
  const upcoming = video('EEEEEEEEEEE'); delete upcoming.liveStreamingDetails.actualStartTime
  const blocked = video('FFFFFFFFFFF'); blocked.status.embeddable = false
  const excluded = video('GGGGGGGGGGG', 'MLB The Show gameplay baseball live')
  const commentary = video('HHHHHHHHHHH', 'Baseball LIVE commentary and analysis')
  const records = [b, a, ended, privateVideo, upcoming, blocked, excluded, commentary]
  let calls = 0
  const get = createLiveService({ clock: () => now, getKey: () => 'fixture-key-never-production', fetcher: async input => {
    calls++; const url = new URL(input)
    if (url.pathname.endsWith('/search')) { for (const [k,v] of Object.entries({ type: 'video', eventType: 'live', videoEmbeddable: 'true' })) assert.equal(url.searchParams.get(k),v); return response({ items: records.map(v=>({ id:{videoId:v.id} })) }) }
    assert.match(url.searchParams.get('part'), /status/); return response({ items:records })
  } })
  const result = await get(); assert.deepEqual(result.videos.map(v=>v.id),[a.id,b.id]); assert.equal(result.videos[1].viewers,null); assert.equal(result.top.length,1)
  const before = calls; await get(); assert.equal(calls,before,'5 minute cache prevents repeat calls')
  assert.equal(inspectVideo(ended, now),'ended')
})
test('WBSC channel identifier comes from channels.list and is enforced', async () => {
  const good=video('AAAAAAAAAAA');const wrong=video('BBBBBBBBBBB');wrong.snippet.channelId='other-channel'
  const get=createLiveService({clock:()=>now,getKey:()=> 'fixture-only',fetcher:async input=>{
    const url=new URL(input)
    if(url.pathname.endsWith('/channels')){assert.equal(url.searchParams.get('forHandle'),'WBSC');return response({items:[{id:'official-wbsc'}]})}
    if(url.pathname.endsWith('/search')){assert.equal(url.searchParams.get('channelId'),'official-wbsc');return response({items:[{id:{videoId:good.id}},{id:{videoId:wrong.id}}]})}
    return response({items:[good,wrong]})
  }})
  assert.deepEqual((await get({channel:'wbsc'})).videos.map(v=>v.id),[good.id])
})
test('missing key, permission, quota, ended and empty are distinct', async () => {
  await assert.rejects(createLiveService({getKey:()=>''})(),e=>e.code==='missing_key')
  for(const [reason,code] of [['quotaExceeded','quota_exceeded'],['keyInvalid','permission_denied']]){
    const get=createLiveService({getKey:()=> 'fixture-only',fetcher:async()=>({ok:false,status:403,json:async()=>({error:{errors:[{reason}]}})})})
    await assert.rejects(get(),e=>e.code===code)
  }
  const get=createLiveService({getKey:()=> 'fixture-only',fetcher:async()=>response({items:[]})})
  assert.deepEqual((await get()).videos,[])
  const v=video('AAAAAAAAAAA');v.liveStreamingDetails.actualEndTime='2026-10-21T05:30:00Z'
  const ended=createLiveService({getKey:()=> 'fixture-only',clock:()=>now,fetcher:async()=>response({items:[v]})})
  assert.equal((await ended({videoId:v.id})).videoState,'ended')
})
test('cache expires after five minutes and coalesces simultaneous requests', async()=>{
 let time=now,calls=0
 const get=createLiveService({clock:()=>time,getKey:()=> 'fixture-only',fetcher:async()=>{calls++;await new Promise(r=>setTimeout(r,5));return response({items:[]})}})
 await Promise.all([get(),get(),get()]);assert.equal(calls,2)
 time+=299999;await get();assert.equal(calls,2)
 time+=2;await get();assert.equal(calls,4)
})
test('HTTP error does not include key or upstream URL',async()=>{
 const res={status(n){this.code=n;return this},setHeader(){},json(data){this.data=data}}
 await liveHandler({method:'POST'},res);assert.equal(res.code,405);assert.deepEqual(res.data,{error:'method_not_allowed'})
})
