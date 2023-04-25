// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-app.js";
import { FacebookAuthProvider, GoogleAuthProvider, getAuth, signInWithRedirect } from 'https://www.gstatic.com/firebasejs/9.19.1/firebase-auth.js'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAYwLIkAUkXJvUeNqf-Uy0YpdoqAkSDIY4",
  authDomain: "coltrekking.firebaseapp.com",
  projectId: "coltrekking",
  storageBucket: "coltrekking.appspot.com",
  messagingSenderId: "1082334786056",
  appId: "1:1082334786056:web:9884aab1e74c8da305d7bd"
};

// Initialize Firebase
const app	= initializeApp(firebaseConfig)
const a		= getAuth(app)
const p		= new GoogleAuthProvider()

document.getElementById('loginGoogle').addEventListener('click', function ()
{
	signInWithRedirect(a, p)
})
