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
    const usuarioLogado = obterUserFormatado(result)

    if(usuarioLogado === null)
		console.log("Nao tem user")
	else
 		enviarUserParaDB(usuarioLogado, '/post-user')
})

const obterUserFormatado    = function(resultado)
{
    let usuarioInfo = {}

    if(resultado)
    {
        usuarioInfo.Nome    = resultado.displayName;
        usuarioInfo.Email   = resultado.email;
        usuarioInfo.Foto    = resultado.photoURL;
        usuarioInfo.ID      = resultado.uid;
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
