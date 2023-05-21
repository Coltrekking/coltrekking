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

const app       = initializeApp(firebaseConfig)
const auth      = getAuth(app)
const provedor  = new GoogleAuthProvider()

const logarComPopup = function()
{
	signInWithPopup(auth, provedor)
}

onAuthStateChanged(auth, (result) =>
{
    const usuarioLogado = obterUserAtual()

    if(usuarioLogado === null)
		console.log("Nao tem user")
	else
 		enviarUserParaDB(usuarioLogado, '/post-user')
})

const obterUserAtual    = function()
{
	const user      = auth.currentUser
    let usuarioInfo = {}

    if(user)
    {
        usuarioInfo.Nome    = user.displayName;
        usuarioInfo.Email   = user.email;
        usuarioInfo.Foto    = user.photoURL;
        usuarioInfo.ID      = user.uid;
    }
    else
        usuarioInfo = null

    return usuarioInfo
}

const enviarUserParaDB  = function(usuario, url)
{
    $.ajax
    ({
        type: "POST",
        url: url,
        data: usuario,
        success: function (answer)
        {
            window.location = answer;
        },
        error: function (answer, status)
        {
            reativarBotoes();
            console.log(answer.responseText);
            alert("Erro ao realizar o login! Tente novamente");
        }
    });
}

document.getElementById('loginGoogle').addEventListener('click', logarComPopup)
document.getElementById('loginGoogleMobile').addEventListener('click', logarComPopup)
