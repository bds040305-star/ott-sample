import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
const dir=await mkdtemp(join(tmpdir(),'ott-rules-'))
const fragment=await readFile(new URL('../firebase/live-baseball.rules.fragment',import.meta.url),'utf8')
await writeFile(join(dir,'firestore.rules'),`rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { ${fragment} } }`)
await writeFile(join(dir,'firebase.json'),JSON.stringify({firestore:{rules:'firestore.rules'},emulators:{firestore:{host:'127.0.0.1',port:8080},ui:{enabled:false},singleProjectMode:true}}))
const child=spawn(resolve('node_modules/.bin/firebase'),['emulators:exec','--only','firestore','--project','demo-ott-sports','--config',join(dir,'firebase.json'),'node --test server/firestore.rules.test.js'],{stdio:'inherit',env:{...process.env,XDG_CONFIG_HOME:join(dir,'config'),FIREBASE_EMULATORS_PATH:join(tmpdir(),'ott-firebase-emulators')}})
child.on('exit',code=>{process.exitCode=code??1})
