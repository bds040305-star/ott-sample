import { create } from "zustand";

import {
    signInWithPopup,
    signOut
} from "firebase/auth";

import {
    doc,
    getDoc,
    setDoc
} from "firebase/firestore";

import {
    auth,
    googleProvider,
    db
} from "../firebase/firebase";


export const useAuthStore = create((set) => ({

    // 사용자 정보
    user: null,

    // 현재 선택된 멤버
    currentMember: null,

    onSetMember: (member) => {
        console.log(member);
        set({ currentMember: member })
    },

    // 구글 로그인
    onGoogleLogin: async () => {

        try {

            const result = await signInWithPopup(
                auth,
                googleProvider
            );


            console.log("구글 로그인 성공", result);


            const user = result.user;


            // Firestore 사용자 문서 위치
            const userRef = doc(
                db,
                "users",
                user.uid
            );


            // 기존 사용자 정보 가져오기
            const userDoc = await getDoc(userRef);


            console.log(
                "가져온 정보",
                userDoc.data()
            );


            // 신규 사용자
            if (!userDoc.exists()) {

                const userInfo = {

                    uid: user.uid,

                    email: user.email,

                    name: user.displayName,

                    photoURL: user.photoURL,

                    phone: user.phoneNumber,

                    familyMembers: {

                        아빠: {
                            likes: [],
                            watchHistory: []
                        },

                        엄마: {
                            likes: [],
                            watchHistory: []
                        },

                        아들: {
                            likes: [],
                            watchHistory: []
                        },

                        딸: {
                            likes: [],
                            watchHistory: []
                        }

                    }

                };


                // Firestore 저장
                await setDoc(
                    userRef,
                    userInfo
                );


                set({
                    user: userInfo,
                    currentMember: null
                });


            } else {

                // 기존 사용자
                set({
                    user: userDoc.data(),
                    currentMember: null
                });

            }


            // Login.jsx에서 사용할 Firebase 사용자 반환
            return user;


        } catch (err) {

            console.error(
                "구글 로그인 에러:",
                err
            );


            return null;

        }

    },


    // 로그아웃
    onLogout: async () => {

        try {

            await signOut(auth);


            set({
                user: null,
                currentMember: null
            });


            console.log("로그아웃 성공");


        } catch (err) {

            console.error(
                "로그아웃 에러:",
                err
            );

        }

    }

}));