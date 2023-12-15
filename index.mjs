/********************************SETUP**********************************/
import * as path     from 'path'
import express       from 'express'
import bodyParser    from 'body-parser'
import session       from 'express-session'

import * as db       from './db.mjs'
import * as user     from './user.mjs'
import * as lstNeg   from './blacklist.mjs'
import * as evento   from './event.mjs'
import * as postagem from './postagem.mjs'
import __dirname     from './root_dir.mjs'

//var aws = require('aws-sdk/lib/maintenance_mode_message').suppress = true;
var app = express();

//*****DEPENDENCIAS*****//
//Utilizar o BodyParser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//Utilizar o express-session
app.use(session({
	secret: 'S3NH4',
	resave: true,
	saveUninitialized: true
}));

//Utilizar o express-static
app.use(express.static('./', {
	index: 'html/login/index.html'
}));

/*********************************PAGINAS********************************/

var index = '/html/index.html';
var login = '/html/login/index.html';

/*********************************FUNCOES********************************/

//*****Retorno para acoes no DB*****//

const enviaEstado	= (res, status)	=> res.send(status)
const enviaLinhas	= (res, rows)	=> res.send(rows)

/******************************REQUISICOES*******************************/

//*****Carrega pagina inicial*****//
app.get("/", function (req, res) {
	req.session.loginSucesso = false;
	res.sendFile(path.join(__dirname, login));
});

/* EVENTOS */
app.post("/criar-evento",        (req, res) => db.executa(req, res, evento.criarEventoDB,        enviaEstado))
app.post("/editar-evento",       (req, res) => db.executa(req, res, evento.editarEventoDB,       enviaEstado))
app.post("/confirmar-evento",    (req, res) => db.executa(req, res, evento.confirmarEventoDB,    enviaEstado))
app.post("/cancelar-evento",     (req, res) => db.executa(req, res, evento.cancelarEventoDB,     enviaEstado))
app.post("/cadastrar-pontuacao", (req, res) => db.executa(req, res, evento.cadastrarPontuacaoDB, enviaEstado))
app.post("/finalizar-evento",    (req, res) => db.executa(req, res, evento.finalizarEventoDB,    enviaEstado))
app.post("/excluir-evento",      (req, res) => db.executa(req, res, evento.excluirEventoDB,      enviaEstado))
app.post("/salvar-trilha",       (req, res) => db.executa(req, res, evento.salvaTrilha,          enviaEstado))
app.get("/eventos",              (req, res) => db.executa(req, res, evento.getEventos,           enviaLinhas))
app.post("/confirmados",         (req, res) => db.executa(req, res, getConfirmados,              enviaLinhas))
app.post("/confirmados-por-mim", (req, res) => db.executa(req, res, getConfirmadosPorMim,        enviaLinhas))
app.post("/excluir-usuario",       (req, res) => db.executa(req, res, evento.excluirUsuarioDB,   enviaEstado))
//app.post("/ranking",           (req, res) => db.executa(req, res, evento.montaRanking,         enviaLinhas))

/* POSTAGENS */
/*
app.post("/editar-info",      (req, res) => execute(req, res, postagem.editarInfoDB));
*/

app.post("/criar-postagem",   (req, res) => db.executa(req, res, postagem.criarPostagemDB,   enviaEstado))
app.post("/excluir-postagem", (req, res) => db.executa(req, res, postagem.excluirPostagemDB, enviaEstado))
app.get("/get-postagem",      (req, res) => db.executa(req, res, postagem.getPostagemDB,     enviaLinhas))

/* LISTA NEGRA */

app.post("/adicionar-lista-negra", (req, res) => db.executa(req, res, lstNeg.adicionarListaNegraDB, enviaEstado))
app.post("/remover-lista-negra",   (req, res) => db.executa(req, res, lstNeg.removerListaNegraDB,   enviaEstado))

//*****Posta usuario logado*****//

app.post("/post-user", (req, res) =>
{
	if (!req.body.ID || req.body.ID.length < 5)
	{
		res.status(500);
		res.send("Problema com o firebase");
	}
	else
	{
		req.session.usuarioLogado = req.body

		db.executa(req, res, user.addDB,	(res, status) =>
		{
			if (status)
			{
				req.session.loginSucesso = true;

				db.executa(req, res, user.pegaInfoUsuarioLogado,	(res, status) =>
				{
					if (status)

						res.send("/main-page")
					else
					{
						res.status(500);
						res.send("Algo inesperado aconteceu");
					}
				})
			}
			else
			{
				res.status(500);
				res.send("Problema com o firebase");
			}
		})
	}
})

//*****Redireciona para pagina principal*****//

app.get("/main-page", function (req, res) {
	if (req.session.loginSucesso) {
		res.sendFile(path.join(__dirname, index));
	}
	else {
		res.sendFile(path.join(__dirname, login));
	}
});

//*****Acessa info do usuario logado*****//
app.get("/get-user", function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	res.json(req.session.usuarioLogado);
});

app.get("/logout", function (req, res) {
	//Usuario deslogado
	req.session.loginSucesso = false;
	//Deleta session
	delete req.session.usuarioLogado;
	//Manda para pagina de logout
	res.sendFile(path.join(__dirname, login));
});

/***************************BANCO DE DADOS*****************************/

function getConfirmados(req, res, connection, callback)
{
	let data	= req.body.IDEvento

	//Get os IDs dos confirmados com INNER JOIN
	connection.post('',
	{
		comando: 'junta',
		parametros:
		{
			tabelaInicial: { tabela: 'inscricoes', apelido: 'inscricao', chave: { IDEvento: data } },
			relacionamentos:
			[
				{ tabela: 'pessoas', apelido: 'confirmado', origem: 'inscricao.IDPessoa', destino: 'ID' }
			]
		}
	})
	.then(resultado =>
	{
		resultado = resultado.data

		if(resultado == false)
		{
			callback(res, [])
		}
		else
		{
			const linhas = resultado.map(r =>
			{
				let linha = {}

				linha.Nome              = r.confirmado.Nome
				linha.FatorK            = r.confirmado.FatorK
				linha.rg                = r.confirmado.rg
				linha.ListaEspera       = r.inscricao.ListaEspera
				linha.IDEvento          = r.inscricao.IDEvento
				linha.Colocacao         = r.inscricao.Colocacao
				linha.DataHoraInscricao = r.inscricao.DataHoraInscricao
				linha.DataInscricao     = r.inscricao.DataInscricao
				linha.listaNegraEvento  = r.inscricao.listaNegraEvento

				return linha
			})

			callback(res, linhas)
		}
	})
	.catch(erro => callback(res, false))
}

//*****Get Confirmados Por Mim*****//
function getConfirmadosPorMim(req, res, connection, callback)
{
	let data	= req.body.usuarioID

	connection.post('',
	{
		comando: 'junta',
		parametros:
		{
			tabelaInicial: { tabela: 'eventos', apelido: 'evt', chave: {} },
			relacionamentos:
			[
				{ tabela: 'inscricoes', apelido: 'ins', origem: 'evt.ID', destino: 'IDEvento' }
			],
			chave:
			{
				'ins.IDPessoa': data
			}
		}
	})
	.then(answer =>
	{
		const resultado = answer.data
		const linhas    = resultado.map(r =>
		{
			let linha = {}

			linha.Nome = r.evt.Nome
			linha.ID   = r.evt.ID

			return linha
		})

		callback(res, linhas)
	})
	.catch(error => callback(res, false))
}

/*************************INICIA SERVIDOR*****************************/
var port = process.env.PORT || 80;

app.listen(port, () => {} );
