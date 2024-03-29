function Usuario(nome, email, foto, id, fatork, posicao, listaNegra, rg, admin)
{
	this.Nome	    = nome
	this.Email	    = email
	this.Foto	    = foto
	this.ID         = id
	this.FatorK	    = fatork
	this.Posicao    = posicao
	this.ListaNegra	= listaNegra
	this.rg         = rg
	this.Admin	    = admin
}

//*****Adicionar usuario ao DB*****//
function addDB(req, res, connection, callback) {
	var usuario = new Usuario(req.session.usuarioLogado.Nome, req.session.usuarioLogado.Email, req.session.usuarioLogado.Foto, req.session.usuarioLogado.ID, 0, 1, 0, null, 0);

	//Adiciona ao DB de Pessoas
	connection.post('',
	{
		comando: 'cria',
		parametros:
		{
			tabela: 'pessoas',
			instancia: usuario,
			chave:
			{
				ID: req.session.usuarioLogado.ID
			}
		}
	})
	.then((answer) => callback(res, true))
	.catch((erro) => callback(res, false))
}

//*****Pega Info do Usuario Logado*****//
//Pega info como fatork, posicao, etc
function pegaInfoUsuarioLogado(req, res, connection, callback)
{
	connection.post('',
	{
		comando: 'encontra',
		parametros:
		{
			tabela: 'pessoas',
			umaInstancia: true,
			chave:
			{
				ID: req.session.usuarioLogado.ID
			}
		}
	})
	.then((linha) =>
	{
		try
		{
			linha                                = linha.data
			req.session.usuarioLogado.FatorK     = linha.FatorK;
			req.session.usuarioLogado.Posicao	 = linha.Posicao;
			req.session.usuarioLogado.ListaNegra = linha.ListaNegra;
			req.session.usuarioLogado.rg         = linha.rg;
			req.session.usuarioLogado.Admin      = linha.Admin;
		}
		catch (err)
		{
			callback(res, false);
		}

		//Realiza o callback
		callback(res, true);
	})
	.catch((erro) => callback(res, false))
}

//*****Esta Inscrito*****//
function estaInscrito(req, res, connection, callback)
{
	let post	= req.body

	connection.post('',
	{
		comando: 'encontra',
		parametros:
		{
			tabela: 'inscricoes',
			umaInstancia: false,
			chave:
			{
				IDPessoa: post.usuario,
				IDEvento: post.evento
			}
		}
	})
	.then(answer =>
	{
		let rows = answer.data

		callback(rows != false)
	})
	.catch(error => callback(true))
}

export { Usuario, addDB, pegaInfoUsuarioLogado, estaInscrito }
