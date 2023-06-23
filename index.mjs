/********************************SETUP**********************************/
import * as http	from 'http'
import * as fs		from 'fs'
import * as url		from 'url'
import * as path	from 'path'
import express		from 'express'
import bodyParser	from 'body-parser'
import session 		from 'express-session'

import * as db		from './db.mjs'
import * as user	from './user.mjs'
import * as lstNeg	from './blacklist.mjs'
import * as evento	from './event.mjs'
import * as postagem	from './postagem.mjs'
import __dirname	from './root_dir.mjs'

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

/******************************REQUISICOES*******************************/

const execute	= (req, res, func) =>
{
	if (req.session.usuarioLogado.ID)
	{
		db.handleDatabase(req, res, (req, res, connection) =>
		{
			func(req, req.body, connection, (status) => res.send(status));
		});
	}
	else
		res.send(false);
}

//*****Carrega pagina inicial*****//
app.get("/", function (req, res) {
	req.session.loginSucesso = false;
	res.sendFile(path.join(__dirname, login));
});

/* EVENTOS */
app.post("/criar-evento",			(req, res) => execute(req, res, evento.criarEventoDB));
app.post("/editar-evento",			(req, res) => execute(req, res, evento.editarEventoDB));
app.post("/confirmar-evento",		(req, res) => execute(req, res, evento.confirmarEventoDB));
app.post("/cancelar-evento",		(req, res) => execute(req, res, evento.cancelarEventoDB));
app.post("/cadastrar-pontuacao",	(req, res) => execute(req, res, evento.cadastrarPontucaoDB));
app.post("/finalizar-evento",		(req, res) => execute(req, res, evento.finalizarEventoDB));
app.post("/excluir-evento",			(req, res) => execute(req, res, evento.excluirEventoDB));

/* POSTAGENS */
app.post("/criar-postagem",			(req, res) => execute(req, res, postagem.criarPostagemDB));
app.post("/editar-info",			(req, res) => execute(req, res, postagem.editarInfoDB));
app.post("/get-postagem",			(req, res) => execute(req, res, postagem.getPostagemDB));
app.post("/excluir-postagem",		(req, res) => execute(req, res, postagem.excluirPostagemDB));

/* LISTA NEGRA */
app.post("/adicionar-lista-negra",	(req, res) => execute(req, res, lstNeg.adicionarListaNegraDB));
app.post("/remover-lista-negra",	(req, res) => execute(req, res, lstNeg.removerListaNegraDB));
app.post("/excluir-usuario",		(req, res) => execute(req, res, evento.excluirUsuarioDB));

//*****Posta usuario logado*****//
app.post("/post-user", function (req, res) {
	if (!req.body.ID || req.body.ID.length < 5) {
		res.status(500);
		res.send("Problema com o firebase");
	} else {
		req.session.usuarioLogado = req.body;

		//Adiciona usuario ao DB
		db.handleDatabase(req, res, function (req, res, connection) {
			user.addDB(req, connection, function (status) {
				if (status) {
					req.session.loginSucesso = true;

					db.handleDatabase(req, res, function (req, res, connection) {
						//Pega info como fatork, posicao, etc
						user.pegaInfoUsuarioLogado(req, connection, function (status) {
							if (status) {
								//Depois de fazer login, manda pagina a ser redirecionado
								res.send("/main-page");
							} else {
								res.status(500);
								res.send("Algo inesperado aconteceu");
							}
						});
					});
				} else {
					res.status(500);
					res.send("Problema com o firebase");
				}
			});
		});

	}
});

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

//******Get informacoes iniciais*****//
app.get("/informacoesiniciais", function (req, res) {
	db.handleDatabase(req, res, function (req, res, connection) {
		getInformacoesiniciais(connection, function (rows) {
			res.send(rows);
		});
	});
});

//******Get Eventos*****//
app.get("/eventos", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			evento.getEventos(connection, function (rows) {
				res.send(rows);
			});
		});
	}
});

//*****Post Confirmados*****//
app.post("/confirmados", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			getConfirmados(req.body.IDEvento, connection, function (rows) {
				res.send(rows);
			});
		});
	}
});

//*****Post Confirmados por Mim*****//
app.post("/confirmados-por-mim", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			getConfirmadosPorMim(req.body.usuarioID, connection, function (rows) {
				res.send(rows);
			});
		});
	}
});

//*****Ranking*****//
app.post("/ranking", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			evento.montaRanking(req.body.ano, connection, function callback(rows) {
				res.send(rows);
			});
		});
	}
});

//*****Log Out*****//
app.get("/logout", function (req, res) {
	//Usuario deslogado
	req.session.loginSucesso = false;
	//Deleta session
	delete req.session.usuarioLogado;
	//Manda para pagina de logout
	res.sendFile(path.join(__dirname, login));
});

/***************************BANCO DE DADOS*****************************/
//*****Get Informacoes Iniciais*****//
function getInformacoesiniciais(connection, callback) {
	connection.query('SELECT Texto, ComoParticipar, Calendario, Regras FROM postagem WHERE ID = 1', function (err, rows, fields) {
		connection.release();
		if (!err) {
			callback(rows);
		} else {
			callback(false);
		}
	});
}

//*****Get Confirmados*****//
function getConfirmados(data, connection, callback) {
	//Get os IDs dos confirmados com INNER JOIN
	connection.query('SELECT ID, Nome, FatorK, rg, `pessoa-evento`.ListaEspera, `pessoa-evento`.IDEvento, `pessoa-evento`.Colocacao, `pessoa-evento`.DataHoraInscricao, `pessoa-evento`.DataInscricao, `pessoa-evento`.listaNegraEvento FROM `pessoa` INNER JOIN `pessoa-evento` ON pessoa.ID = `pessoa-evento`.IDPessoa WHERE `pessoa-evento`.IDEvento = ? ORDER BY `pessoa-evento`.DataHoraInscricao, `pessoa-evento`.Colocacao', data, function (err, rows, fields) {
		connection.release();

		if (!err) {
			callback(rows);
		} else {
			callback(false);
		}
	});
}

//*****Get Confirmados Por Mim*****//
function getConfirmadosPorMim(data, connection, callback) {
	connection.query('SELECT ID, Nome FROM `evento` INNER JOIN `pessoa-evento` ON evento.ID = `pessoa-evento`.IDEvento WHERE `pessoa-evento`.IDPessoa = ? ORDER BY ID DESC', data, function (err, rows, fields) {
		connection.release();

		if (!err) {
			callback(rows);
		} else {
			callback(false);
		}
	});
}

/*************************INICIA SERVIDOR*****************************/
var port = process.env.PORT || 80;

app.listen(port, () => {} );
