import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.19.1/firebase-app.js'
import { GoogleAuthProvider, getAuth, signInWithPopup, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.19.1/firebase-auth.js'

const firebaseConfig    =
{
    apiKey: "AIzaSyAYwLIkAUkXJvUeNqf-Uy0YpdoqAkSDIY4",
    authDomain: "coltrekking.firebaseapp.com",
    projectId: "coltrekking",
    storageBucket: "coltrekking.appspot.com",
    messagingSenderId: "1082334786056",
    appId: "1:1082334786056:web:9884aab1e74c8da305d7bd"
}

export const auth       = {}
auth.app                = initializeApp(firebaseConfig)
auth.servico            = getAuth(auth.app)
auth.provedorGmail      = new GoogleAuthProvider()
auth.signInWithPopup    = signInWithPopup
auth.onAuthStateChanged = onAuthStateChanged
