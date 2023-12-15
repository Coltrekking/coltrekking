import * as tempo	from './tempo.mjs'
import * as user	from './user.mjs'

//*****Adiciona Evento ao DB*****/
function criarEventoDB(req, res, connection, callback)
{
	let data	= req.body

	if (req.session.usuarioLogado.Admin)
	{
		connection.post('',
		{
			comando: 'cria',
			parametros:
			{
				tabela: 'eventos',
				instancia: data,
				chave:
				{
					ID: 'unique id'
				}
			}
		})
		.then((answer) =>
		{
			connection.post('',
			{
				comando: 'muda',
				parametros:
				{
					tabela: 'pessoas',
					umaInstancia: false,
					chave:
					{
						ListaNegra: 2
					},
					alteracoes:
					{
						ListaNegra: 0
					}
				}
			})
			.then((answer) =>
			{
				connection.post('',
				{
					comando: 'muda',
					parametros:
					{
						tabela: 'pessoas',
						umaInstancia: false,
						chave:
						{
							ListaNegra: 1
						},
						alteracoes:
						{
							ListaNegra: 2
						}
					}
				})
				.then((answer) =>
				{
					connection.post('',
					{
						comando: 'muda',
						parametros:
						{
							tabela: 'inscricoes',
							umaInstancia: false,
							chave:
							{
								listaNegraEvento: 3
							},
							alteracoes:
							{
								listaNegraEvento: 2
							}
						}
					})
					.then((answer) =>
					{
						connection.post('',
						{
							comando: 'muda',
							parametros:
							{
								tabela: 'inscricoes',
								umaInstancia: false,
								chave:
								{
									listaNegraEvento: 1
								},
								alteracoes:
								{
									listaNegraEvento: 2
								}
							}
						})
						.then((answer) => callback(res, true))
						.catch((erro) => callback(res, false))
					})
					.catch((erro) => callback(res, false))
				})
				.catch((erro) => callback(res, false))
			})
			.catch((erro) => callback(res, false))
		})
		.catch((erro) => callback(res, false))
	}
}

//*****Editar Evento no DB*****/
function editarEventoDB(req, res, connection, callback)
{
	let data	= req.body

	if (req.session.usuarioLogado.Admin)
	{
		connection.post('',
		{
			comando: 'muda',
			parametros:
			{
				tabela: 'eventos',
				umaInstancia: true,
				chave:
				{
					ID: data.ID
				},
				alteracoes: data
			}
		})
		.then(answer => callback(res, true))
		.catch(erro => callback(res, false))
	}
	else
	{
		callback(res, false);
	}
}

/*****Get Eventos*****/
function getEventos(req, res, connection, callback)
{
	let hora
	
	connection.post('',
	{
		comando: 'encontra',
		parametros:
		{
			tabela: 'eventos',
			umaInstancia: false,
			chave: {}
		}
	})
	.then(answer =>
	{
		let rows = answer.data
		tempo
		.client_ntp
		.syncTime()
		.then(h => hora = h.time)
		.catch(e => hora = new Date())
		.then(() =>
		{
			const MS_POR_HORA	= 3600000;
			let retorno		=
			{
				eventos:             rows.reverse(),
				fusoHorarioServidor: tempo.fusoHorarioServidor * MS_POR_HORA, // h --> ms
				hora:                hora.getTime()
			}
			callback(res, retorno);
		})
	})
	.catch((erro) =>
	{
		console.log(erro)
		callback(res, false)
	})
}

//*****Confirmar Evento DB*****/

function confirmarEventoDB(req, res, connection, callback)
{
	let data	= req.body
	var post;

	//Verifica se evento esta disponivel para inscricao
	estaDisponivel(req, res, connection, (res, status) =>
	{
		let hora
		
		//Se esta disponivel
		if (status)
		{
			//Verifica se o cara ta logado mesmo
			if (data.usuario)
			{
				//Verifica se o cara nao ja esta inscrito
				user.estaInscrito(req, res, connection, (status) =>
				{
					//Se nao esta inscrito
					if (status)
					{
						callback(res, false);
					}
					else
					{
						tempo
						.client_ntp
						.syncTime()
						.then(h => hora = h.time)
						.catch(e => hora = new Date())
						.finally(() =>
							{
								//Datetime eh o horario correto, que ordena a posicao da inscricao
								let datetime

								datetime		= hora.toISOString()
								datetime		= datetime.split('T');
								datetime[1]		= datetime[1].split('.')[0];
								datetime[1]		= datetime[1].split(':');
								datetime[1][0]	= String(parseInt(datetime[1][0]) + tempo.fusoHorarioServidor);
								datetime[1]		= datetime[1].join(':');
								datetime		= datetime.join(' ');

								post =
								{
									IDPessoa: data.usuario,
									IDEvento: data.evento,
									Colocacao: 0,
									ListaEspera: 0,
									DataInscricao: datetime,
									DataHoraInscricao: datetime
								};

								//verifica se o usuario nao esta na lista negra
								if (data.blacklist == 0)
								{
									//Adiciona pessoa ao evento
									connection.post('',
									{
										comando: 'cria',
										parametros:
										{
											tabela: 'inscricoes',
											instancia: post,
											chave:
											{
												IDPessoa: data.usuario,
												IDEvento: data.evento
											}
										}
									})
									.then(answer =>
									{
										//Adicionar rg do usuario
										connection.post('',
										{
											comando: 'muda',
											parametros:
											{
												tabela: 'pessoas',
												umaInstancia: true,
												chave:
												{
													ID: post.IDPessoa
												},
												alteracoes:
												{
													rg: data.rg
												}
											}
										})
										.then(answer => callback(res, true))
										.catch(answer => callback(res, false))
									})
									.catch(error => callback(res, false))
								}
								else
								{
									callback(res, false);
								}
							})
					}
				});
			}
			else
			{
				callback(res, false);
			}
		}
		else
		{
			callback(res, false);
		}
	});
}

//*****Cancelar Evento*****/
function cancelarEventoDB(req, res, connection, callback)
{
	let post	= req.body

	if (post.usuario)
	{
		connection.post('',
		{
			comando: 'deleta',
			parametros:
			{
				tabela: 'inscricoes',
				umaInstancia: true,
				chave:
				{
					IDEvento: post.evento,
					IDPessoa: post.usuario
				}
			}
		})
		.then(answer => callback(res, true))
		.catch(answer => callback(res, false))
	}
	else
	{
		callback(res, false)
	}
}

//*****Esta Disponivel*****/
function estaDisponivel(req, res, connection, callback)
{
	let evento	= req.body.evento

	connection.post('',
	{
		comando: 'encontra',
		parametros:
		{
			tabela: 'eventos',
			umaInstancia: true,
			chave:
			{
				ID: evento
			}
		}
	})
	.then(answer =>
	{
		const FUSO         = -3
		const MS_POR_HORA  = 60 * 60 * 1000
		var resultado      = answer.data
		var dataEvento     = resultado.DataInscricao;
		var dataFim        = resultado.FimInscricao;
		var dataCountdown  = new Date(dataEvento).getTime();
		var dataCountdown2 = new Date(dataFim).getTime();
		var agora          = new Date().getTime() + FUSO * MS_POR_HORA;
		var distancia      = dataCountdown - agora;
		var distancia2     = agora - dataCountdown2;

		callback(res, distancia <= 0 && distancia2 <= 0)
	})
	.catch(error => callback(res, false))
}

//*****Finalizar Evento*****/
function finalizarEventoDB(req, res, connection, callback)
{
	let post	= req.body

	if (req.session.usuarioLogado.Admin)
	{
		connection.post('',
		{
			comando: 'muda',
			parametros:
			{
				tabela: 'eventos',
				umaInstancia: true,
				chave:
				{
					ID: post.eventoID
				},
				alteracoes:
				{
					Finalizado: 1
				}
			}
		})
		.then(answer => callback(res, true))
		.catch(error => callback(res, false))
	}
	else
	{
		callback(res, false)
	}
}

//*****Excluir Evento*****/
function excluirEventoDB(req, res, connection, callback)
{
	let post	= req.body

	if (req.session.usuarioLogado.Admin)
	{
		connection.post('',
		{
			comando: 'deleta',
			parametros:
			{
				tabela: 'eventos',
				umaInstancia: true,
				chave:
				{
					ID: post.ID
				}
			}
		})
		.then(answer =>
		{
			connection.post('',
			{
				comando: 'deleta',
				parametros:
				{
					tabela: 'inscricoes',
					umaInstancia: false,
					chave:
					{
						IDEvento: post.ID
				  	}
				}
			})
			.then(answer => callback(res, true))
			.catch(error => callback(res, false))
		})
		.catch(error => callback(res, false))
	}
	else
	{
		callback(res, false);
	}
}

const salvaTrilha = (req, res, connection, callback) =>
{
	const trilha   = req.body.trilha
	const evento = req.body.evento
	
	connection.post('',
	{
		comando: 'muda',
		parametros:
		{
			tabela: 'eventos',
			umaInstancia: true,
			chave:
			{
				ID: evento
			},
			alteracoes:
			{
				'trilha': JSON.stringify(trilha)
			}
		}
	})
	.then(answer => callback(res, true))
	.catch(error => callback(res, false))
}

//*****Excluir Usuario*****/

function excluirUsuarioDB(req, res, connection, callback)
{
	const post = req.body

	if (req.session.usuarioLogado.Admin)
	{
		connection.post('',
		{
			comando: 'deleta',
			parametros:
			{
				tabela: 'inscricoes',
				umaInstancia: true,
				chave:
				{
					IDEvento: post.IDEvento,
					IDPessoa: post.ID
				}
			}
		})
		.then(resposta => callback(res, resposta.data))
		.catch(erro => callback(res, false))
	}
	else
	{
		callback(res, false)
	}
}

/*

function excluirUsuarioDB(req, post, connection, callback)
{
	if (req.session.usuarioLogado.Admin)
	{
		connection.query('DELETE FROM `pessoa-evento` WHERE IDEvento = ? AND IDPessoa = ?', [post.IDEvento, post.ID], function (err, rows, fields)
		{
			connection.release();

			if (!err)
			{
				callback(res, true);
			}
			else
			{
				callback(res, false);
			}
		});
	}
	else
	{
		callback(res, false);
	}
}

//*****Cadastrar Pontuacao*****/

function cadastrarPontuacaoDB(req, res, connection, callback)
{
	let post = req.body

	if (req.session.usuarioLogado.Admin)
	{
		connection.post('',
		{
			comando: 'muda',
			parametros:
			{
				tabela: 'eventos',
				umaInstancia: true,
				chave:
				{
					ID: post.eventoID
				},
				alteracoes:
				{
					fatorKevento: post.fatork,
					subdesc: post.subdesc,
					distancia: post.distancia
				}
			}
		})
		.then(resposta =>
		{
			if(resposta.data)
			{
				connection.post('',
				{
					comando: 'muda',
					parametros:
					{
						tabela: 'inscricoes',
						umaInstancia: false,
						chave:
						{
							IDEvento: post.eventoID,
							listaNegraEvento: 0
						},
						alteracoes:
						{
							fatorKPessoaEvento: post.fatork
						}
					}
				})
				.then(resposta => callback(res, resposta.data))
				.catch(erro => callback(res, false))
			}
			else
			{
				callback(res, false)
			}
		})
		.catch(erro => callback(res, false))
	}
	else
	{
		callback(res, false);
	}
}

//*****Monta Ranking*****/
/*
function montaRanking(req, res, connection, callback)
{
	let ano	= req.body.ano

	connection.query('SELECT `pessoa-evento`.IDPessoa AS ID, pessoa.Nome AS Nome, SUM(FatorKPessoaEvento) AS FatorK FROM pessoa INNER JOIN `pessoa-evento` ON pessoa.ID = `pessoa-evento`.IDPessoa INNER JOIN evento ON evento.ID = `pessoa-evento`.`IDEvento` WHERE `pessoa-evento`.FatorKPessoaEvento > 0 AND evento.ano = ? GROUP BY `pessoa-evento`.IDPessoa ORDER BY FatorK DESC', ano, function (err, rows, fields)
	{
		connection.release();

		if (!err)
		{
			callback(res, rows);
		}
		else
		{
			//console.log(err);
			callback(res, false);
		}
	});
}
*/

export { getEventos, criarEventoDB, confirmarEventoDB, cancelarEventoDB, finalizarEventoDB, excluirEventoDB, editarEventoDB, salvaTrilha, cadastrarPontuacaoDB, excluirUsuarioDB }
//{ criarEventoDB, editarEventoDB, getEventos, confirmarEventoDB, cancelarEventoDB, estaDisponivel, excluirEventoDB, excluirUsuarioDB, cadastrarPontucaoDB, montaRanking, finalizarEventoDB }
