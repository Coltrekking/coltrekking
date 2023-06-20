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
//*****Carrega pagina inicial*****//
app.get("/", function (req, res) {
	req.session.loginSucesso = false;
	res.sendFile(path.join(__dirname, login));
});

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

//*****Criar Evento*****//
app.post("/criar-evento", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			evento.criarEventoDB(req, req.body, connection, function (status) {
				res.send(status);
			});
		});
	}
});

//*****Editar Evento*****//
app.post("/editar-evento", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			evento.editarEventoDB(req, req.body, connection, function (status) {
				res.send(status);
			});
		});
	}
});

//*****Editar Info Inicial*****//
app.post("/editar-info", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			editarInfoDB(req, req.body, connection, function (status) {
				res.send(status);
			});
		});
	}
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

//*****Confirmar Evento*****//
app.post("/confirmar-evento", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			evento.confirmarEventoDB(req.body, connection, function (status) {
				res.send(status);
			});
		});
	}
});

//*****Cancelar Evento*****//
app.post("/cancelar-evento", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			evento.cancelarEventoDB(req.body, connection, function (status) {
				res.send(status);
			});
		});
	}
});

//*****Cadastrar Pontucao*****//
app.post("/cadastrar-pontuacao", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			cadastrarPontucaoDB(req, req.body, connection, function (status) {
				res.send(status);
			});
		});
	}
});



//*****Finalizar Evento*****//
app.post("/finalizar-evento", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			evento.finalizarEventoDB(req, req.body, connection, function (status) {
				res.send(status);
			});
		});
	}
});


//*****Adicionar usuario na lista negra*****//
app.post("/adicionar-lista-negra", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			lstNeg.adicionarListaNegraDB(req, req.body, connection, function (status) {
				res.send(status);
			});
		});
	}
});

//*****Remover usuario da lista negra*****//
app.post("/remover-lista-negra", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			lstNeg.removerListaNegraDB(req, req.body, connection, function (status) {
				res.send(status);
			});
		});
	}
});


//*****Excluir Evento*****//
app.post("/excluir-evento", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			evento.excluirEventoDB(req, req.body, connection, function (status) {
				res.send(status);
			});
		});
	}
});


//*****Excluir Usuario*****//
app.post("/excluir-usuario", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			evento.excluirUsuarioDB(req, req.body, connection, function (status) {
				res.send(status);
			});
		});
	}
});


//*****Criar Postagem*****//
app.post("/criar-postagem", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			criarPostagemDB(req, req.body, connection, function (status) {
				res.send(status);
			});
		});
	}
});

//*****Excluir Postagem*****//
app.post("/excluir-postagem", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			excluirPostagemDB(req, req.body, connection, function (status) {
				res.send(status);
			});
		});
	}
});

//*****Get Postagem*****//
app.get("/get-postagem", function (req, res) {
	if (!req.session.usuarioLogado.ID) {
		res.send(false);
	} else {
		db.handleDatabase(req, res, function (req, res, connection) {
			getPostagemDB(connection, function (status) {
				res.send(status);
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
			montaRanking(req.body.ano, connection, function callback(rows) {
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

//*****Editar Info no DB*****//
function editarInfoDB(req, data, connection, callback) {
	if (req.session.usuarioLogado.Admin) {
		connection.query('UPDATE postagem SET ? WHERE ID = 1', [data], function (err, rows, fields) {
			connection.release();
			if (!err) {
				callback(true);
			} else {
				//	console.log(err);
				callback(false);
			}
		});
	} else {
		callback(false);
	}
}

//*****Get Informacoes Iniciais*****//
function getInformacoesiniciais(connection, callback) {
	connection.query('SELECT Texto, ComoParticipar, Calendario, Regras FROM postagem WHERE ID = 1', function (err, rows, fields) {
		connection.release();
		if (!err) {
			callback(rows);
		} else {
			console.log(err);
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
			//console.log('this.sql', this.sql);
			//console.log(err);
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
			//console.log('this.sql', this.sql);
			//console.log(err);
			callback(false);
		}
	});
}

//*****Cadastrar Pontuacao*****//
function cadastrarPontucaoDB(req, post, connection, callback) {
	var controle = true;
	if (req.session.usuarioLogado.Admin) {
		connection.query('UPDATE `evento` SET fatorKevento = ? WHERE ID = ?', [post.fatork, post.eventoID], function (err, rows, fields) {
			if (!err) {
				connection.query('UPDATE `evento` SET subdesc = ? WHERE ID = ?', [post.subdesc, post.eventoID], function (err, rows, fields) {
					if (!err) {
						connection.query('UPDATE `evento` SET distancia = ? WHERE ID = ?', [post.distancia, post.eventoID], function (err, rows, fields) {
							if (!err) {

								var promessa = new Promise(function (resolve, reject) {
									post.pessoas.forEach(function (elem, index, array) {
										connection.query('UPDATE `pessoa-evento` SET fatorKPessoaEvento = ? WHERE IDEvento = ? AND listaNegraEvento = 0', [post.fatork, post.eventoID], function (err, rows, fields) {
											if (!err) {
												//Se for o ultimo, resolve a promessa
												if (index == (array.length - 1)) {
													resolve();
												}
											} else {
												controle = false;
											}
										});
									});
								});

								promessa.then(function () {
									connection.query('UPDATE `evento` SET Finalizado = 1 WHERE ID = ?', post.eventoID, function (err, rows, fields) {
										connection.release();

										if (!err) {
											callback(controle);
										} else {
											controle = false;
										}
									});
								});


							} else {
								callback(false);
							}
						});
					}
					else {
						callback(false);
					}
				});
			}
			else {
				callback(false);
			}
		});

	} else {
		callback(false);
	}
}

//*****Criar Postagem*****//
function criarPostagemDB(req, data, connection, callback) {
	if (req.session.usuarioLogado.Admin) {
		connection.query('INSERT INTO postagem SET ?', data, function (err, rows, fields) {
			connection.release();

			if (!err) {
				callback(true);
			}
			else {
				//console.log(err);
				callback(false);
			}
		});
	} else {
		callback(false);
	}
}

//*****Get Postagem*****//
function getPostagemDB(connection, callback) {
	connection.query('SELECT postagem.*, evento.Nome, pessoa.Nome AS AdminNome, pessoa.Foto AS AdminFoto FROM postagem LEFT JOIN evento ON postagem.EventoID = evento.ID LEFT JOIN pessoa ON postagem.AdminID = pessoa.ID', function (err, rows, fields) {
		connection.release();

		if (!err) {
			callback(rows);
		}
		else {
			//console.log(err);
			callback(false);
		}
	});
}

//*****Excluir Postagem*****//
function excluirPostagemDB(req, post, connection, callback) {
	if (req.session.usuarioLogado.Admin) {
		connection.query('DELETE FROM `postagem` WHERE ID = ?', post.ID, function (err, rows, fields) {
			connection.release();

			if (!err) {
				callback(true);
			} else {
				callback(false);
			}
		});
	} else {
		callback(false);
	}
}

//*****Esta Inscrito*****//
function estaInscrito(post, connection, callback) {
	connection.query('SELECT * FROM `pessoa-evento` WHERE IDPessoa = ? AND IDEvento = ?', [post.usuario, post.evento], function (err, rows, fields) {
		if (!err) {
			//Se esta ou nao inscrito
			rows.length == 0 ? callback(true) : callback(false);
		} else {
			//console.log('Error while performing Query');
			callback(false);
		}
	});
}

//*****Monta Ranking*****//
function montaRanking(ano, connection, callback) {
	connection.query('SELECT `pessoa-evento`.IDPessoa AS ID, pessoa.Nome AS Nome, SUM(FatorKPessoaEvento) AS FatorK FROM pessoa INNER JOIN `pessoa-evento` ON pessoa.ID = `pessoa-evento`.IDPessoa INNER JOIN evento ON evento.ID = `pessoa-evento`.`IDEvento` WHERE `pessoa-evento`.FatorKPessoaEvento > 0 AND evento.ano = ? GROUP BY `pessoa-evento`.IDPessoa ORDER BY FatorK DESC', ano, function (err, rows, fields) {
		connection.release();

		if (!err) {
			callback(rows);
		}
		else {
			//console.log(err);
			callback(false);
		}
	});
}

/*************************INICIA SERVIDOR*****************************/
var port = process.env.PORT || 80;

app.listen(port, function () {
	//console.log("Ouvindo na porta " + port);
});
