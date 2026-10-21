// Browser UI fixtures ONLY: this does not prove a real YouTube video plays.
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
const dir=await mkdtemp(join(tmpdir(),'ott-live-browser-'))
const child=spawn(process.env.CHROMIUM_PATH || 'chromium',['--headless','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${dir}`,'about:blank'],{stdio:'ignore'})
let ws
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
try{
 let port
 for(let n=0;n<100;n++){try{port=(await readFile(join(dir,'DevToolsActivePort'),'utf8')).split('\n')[0];break}catch{await sleep(100)}}
 if(!port)throw Error('Chromium failed to start')
 const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()
 ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl)
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject})
 let serial=0;const pending=new Map()
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})
 let mode='real-missing-key'
 const videos=Array.from({length:6},(_,index)=>({id:String.fromCharCode(65+index).repeat(11),title:`Fixture baseball game ${index+1}`,channelTitle:index===0?'WBSC':'Fixture Sports',channelId:index===0?'wbsc':'other',viewers:600-index*100,thumbnail:null,originalUrl:`https://www.youtube.com/watch?v=${String.fromCharCode(65+index).repeat(11)}`}))
 ws.onmessage=({data})=>{
  const message=JSON.parse(data)
  if(message.id){const task=pending.get(message.id);pending.delete(message.id);message.error?task.reject(message.error):task.resolve(message.result)}
  if(message.method==='Fetch.requestPaused'){
   const e=message.params,url=new URL(e.request.url)
   if(mode==='real-missing-key'){call('Fetch.continueRequest',{requestId:e.requestId});return}
   const selected=url.searchParams.get('videoId')
   const list=selected?videos.filter(v=>v.id===selected):url.searchParams.get('channel')==='wbsc'?videos.slice(0,1):videos
   const data=mode==='quota'?{error:'quota_exceeded'}:{videos:list,top:list.slice(0,5),channel:'all',searchCap:200,checkedAt:new Date().toISOString(),...(selected?{videoState:'live'}:{})}
   call('Fetch.fulfillRequest',{requestId:e.requestId,responseCode:mode==='quota'?429:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(data)).toString('base64')})
  }
 }
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
 const until=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(150)}throw Error('UI timeout '+expression)}
 await call('Page.enable');await call('Fetch.enable',{patterns:[{urlPattern:'*/api/live-baseball*'}]})
 await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.YT={Player:class{constructor(node,config){const b=document.createElement('button');b.textContent='MOCK PLAYER';node.appendChild(b);b.onclick=()=>config.events.onStateChange({data:1});queueMicrotask(()=>config.events.onReady())}destroy(){}}}`})
 const base=process.env.SPORTS_TEST_URL || 'http://127.0.0.1:3001/sports'
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
 await call('Page.navigate',{url:base})
 await until("document.querySelector('.sports-feed-status')?.textContent.includes('YOUTUBE_API_KEY')")
 assert.equal(await evaluate("document.querySelectorAll('.live-card').length"),0)
 mode='fixture';await evaluate("document.querySelector('.sports-feed-status button').click()")
 await until("document.querySelectorAll('.live-card').length===11")
 assert.equal(await evaluate("document.querySelectorAll('.live-top-grid .live-card').length"),5)
 await until("document.querySelector('.youtube-player-host button') !== null")
 await evaluate("document.querySelector('.youtube-player-host button').click()")
 await until("document.querySelector('.live-playback-status').textContent.includes('재생 중')")
 await evaluate("document.querySelectorAll('.live-card')[1].click()")
 await until("document.querySelector('.sports-match-info h2').textContent==='Fixture baseball game 2'")
 assert.ok(await evaluate("document.querySelector('.chat-login a').textContent.includes('로그인')"))
 await evaluate("document.querySelectorAll('.sports-filters button')[1].click()")
 await until("document.querySelectorAll('.live-card').length===2")
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(200)
 assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false)
 const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(join(dir,'mobile.png'),Buffer.from(shot.data,'base64'))
 mode='quota';await evaluate("document.querySelector('.sports-feed-status button').click()")
 await until("document.querySelector('.sports-feed-status').textContent.includes('할당량')")
 console.log('PASS browser fixtures: real missing-key response, zero fake cards, TOP5/all, WBSC, selection, mocked player state, login gate, mobile, quota error. Screenshot: '+join(dir,'mobile.png'))
}finally{ws?.close();child.kill('SIGTERM')}
