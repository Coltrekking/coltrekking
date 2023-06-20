import { auth } from '../firebase.js'

auth.onAuthStateChanged(auth.servico, (user) =>
{
    const usuarioLogado = obterUserFormatado(user)

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

const enviarUserParaDB      = function(usuario, url)
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
            //reativarBotoes();
            console.log(answer.responseText);
            alert("Erro ao realizar o login! Tente novamente");
        }
    });
}

document.getElementById('loginGoogle')          .onclick    = () => auth.signInWithPopup(auth.servico, auth.provedorGmail)
document.getElementById('loginGoogleMobile')    .onclick    = () => auth.signInWithPopup(auth.servico, auth.provedorGmail)
