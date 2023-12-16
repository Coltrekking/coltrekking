import * as firebase    from '../firebase.mjs'

firebase.auth.onAuthStateChanged(firebase.servicoAuth, (user) =>
{
    const usuarioLogado = obterUserFormatado(user)

    if(usuarioLogado === null)
    {
		console.log("Nao tem user")
    }
	else if(usuarioLogado.Email.split('@')[1] !== 'teiacoltec.org')
    {
        alert("Erro: dominio de e-mail invalido! Entre utilizando o TeiaColtec.")
        auth.signOut(firebase.servicoAuth)
    }
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
            alert("Erro ao realizar o login! Recarregando a página...");
            location.reload()
        }
    });
}

document.getElementById('loginGoogle')          .onclick    = () => firebase.auth.signInWithPopup(firebase.servicoAuth, firebase.provedorGmail)
document.getElementById('loginGoogleMobile')    .onclick    = () => firebase.auth.signInWithPopup(firebase.servicoAuth, firebase.provedorGmail)
