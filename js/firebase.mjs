import { initializeApp }    from 'https://www.gstatic.com/firebasejs/9.19.1/firebase-app.js'
import * as auth            from 'https://www.gstatic.com/firebasejs/9.19.1/firebase-auth.js'

const firebaseConfig  =
{
    apiKey:             "AIzaSyAYwLIkAUkXJvUeNqf-Uy0YpdoqAkSDIY4",
    authDomain:         "coltrekking.firebaseapp.com",
    projectId:          "coltrekking",
    storageBucket:      "coltrekking.appspot.com",
    messagingSenderId:  "1082334786056",
    appId:              "1:1082334786056:web:9884aab1e74c8da305d7bd"
}

const app           = initializeApp(firebaseConfig)
const servicoAuth   = auth.getAuth(app)
const provedorGmail = new auth.GoogleAuthProvider()

export { app, auth, servicoAuth, provedorGmail }