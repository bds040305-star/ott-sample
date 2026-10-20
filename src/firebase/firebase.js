import { initializeApp } from "firebase/app";

import {
    getAuth,
    GoogleAuthProvider
} from "firebase/auth";

import {
    getFirestore
} from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyCC3jsJqqQZIxDaTFB1mdZVfnGL1I-eIIg",
  authDomain: "ott-test-5a1de.firebaseapp.com",
  projectId: "ott-test-5a1de",
  storageBucket: "ott-test-5a1de.firebasestorage.app",
  messagingSenderId: "240521144123",
  appId: "1:240521144123:web:b64ea6a949cb20c1f8b91e"
};


// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);


// 인증
export const auth = getAuth(app);


// 구글 로그인 제공자
export const googleProvider = new GoogleAuthProvider();


// Firestore
export const db = getFirestore(app);