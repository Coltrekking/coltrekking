import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.19.1/firebase-app.js'
import { GoogleAuthProvider, getAuth, signInWithPopup, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.19.1/firebase-auth.js'

const firebaseConfig	=
{
	apiKey: "AIzaSyDgHvjk_egZsR4CQms6Bt5UM0xTtm8yVTA",
	authDomain: "studing-auth.firebaseapp.com",
	projectId: "studing-auth",
	storageBucket: "studing-auth.appspot.com",
	messagingSenderId: "251455055976",
	appId: "1:251455055976:web:cafd87c3a8fec4c461f3dd",
	measurementId: "G-Q0RFG09VT7"
}
const app	= initializeApp(firebaseConfig)
const a		= getAuth(app)
const p		= new GoogleAuthProvider()
//let result	= new Object()
let user	= new Object()
let url		= ''

document.getElementById('login').addEventListener('click', function ()
{
	signInWithPopup(a, p)
})

onAuthStateChanged(a, (result) =>
{
	if(result)
	{
		console.log(result.email)
	//}
	//user	= a.currentUser
	//if(user)
	//{
		//Seta info do usuario logado
		user.Nome = result.displayName;
		user.Email = result.email;
		user.Foto = result.photoURL;
		user.ID = result.uid;

		console.log(user)
		/*Manda usuario para server*/
 		//url = "/post-user";
		url	= '/post-user'
		$.ajax
		({
			type: "POST",
			url: url,
			data: user,
			success: function (answer) {
				console.log(answer)
				window.location = answer;
			},
			error: function (answer, status) {
				reativarBotoes();
				console.log(answer.responseText);
				alert("Erro ao realizar o login! Tente novamente");
			}
		});
	}
	else
	{
		console.log("Nao tem user");
	}
})
