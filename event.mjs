import * as tempo	from './tempo.mjs'
import * as user	from './user.mjs'

//*****Adiciona Evento ao DB*****//
function criarEventoDB(req, res, connection, callback)
{
	let data	= req.body

	if (req.session.usuarioLogado.Admin)
	{
		connection.query('INSERT INTO evento SET ?', data, function (err, rows, fields)
		{
			if (!err)
			{
				connection.query('UPDATE `pessoa` SET ListaNegra = 0 WHERE ListaNegra = 2', function (err, rows, fields)
				{
					if (!err)
					{
						connection.query('UPDATE `pessoa` SET ListaNegra = 2 WHERE ListaNegra = 1', function (err, rows, fields)
						{
							if (!err)
							{
								connection.query('UPDATE `pessoa-evento` SET listaNegraEvento = 3 WHERE listaNegraEvento = 2', function (err, rows, fields)
								{
									if (!err)
									{
										connection.query('UPDATE `pessoa-evento` SET listaNegraEvento = 2 WHERE listaNegraEvento = 1', function (err, rows, fields)
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
								});
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
				});
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

//*****Editar Evento no DB*****//
function editarEventoDB(req, res, connection, callback)
{
	let data	= req.body

	if (req.session.usuarioLogado.Admin)
	{
		connection.query('UPDATE evento SET ? WHERE ID = ?', [data, data.ID], function (err, rows, fields)
		{
			connection.release();

			if (!err)
			{
				callback(res, true);
			}
			else
			{
				//	console.log(err);
				callback(res, false);
			}
		});
	}
	else
	{
		callback(res, false);
	}
}

//*****Get Eventos*****//
function getEventos(req, res, connection, callback)
{
	connection.query('SELECT * FROM evento', function (err, rows, fields)
	{
		connection.release();

		if (!err)
		{
			tempo
			.client_ntp
			.syncTime()
			.then(momento =>
				{
					const MS_POR_HORA	= 3600000;
					let retorno		=
					{
						eventos:		rows.reverse(),
						fusoHorarioServidor:	tempo.fusoHorarioServidor * MS_POR_HORA, // h --> ms
						hora:			momento.time.getTime()
					}

					callback(res, retorno);
				})
		}
		else
		{
			//console.log(err);
			callback(res, false);
		}
	});
}

//*****Confirmar Evento DB*****//
function confirmarEventoDB(req, res, connection, callback)
{
	let data	= req.body
	var post;

	//Verifica se evento esta disponivel para inscricao
	estaDisponivel(req, res, connection, (status) =>
	{
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
						tempo
						.client_ntp
						.syncTime()
						.then(hora =>
							{
								//Datetime eh o horario correto, que ordena a posicao da inscricao
								let datetime

								datetime		= hora.time.toISOString()
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
									connection.query('INSERT INTO `pessoa-evento` SET ?', post, function (err, rows, fields)
									{
										if (!err)
										{
											//Adicionar rg do usuario
											connection.query('UPDATE `pessoa` SET `rg` = ? WHERE ID = ?', [data.rg, post.IDPessoa], function (err, rows, fields)
										{
												if (!err)
												{
													connection.release();
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
											//console.log('this.sql', this.sql);
											//console.log(err);
											callback(res, false);
										}
									});
								}
								else
								{
									callback(res, false);
								}
							})
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
		else
		{
			callback(res, false);
		}
	});
}

//*****Cancelar Evento*****//
function cancelarEventoDB(req, res, connection, callback)
{
	let post	= req.body

	if (post.usuario)
	{
		connection.query('DELETE FROM `pessoa-evento` WHERE IDEvento = ? AND IDPessoa = ?', [post.evento, post.usuario], function (err, rows, fields)
		{
			if (!err)
			{
				connection.release();
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

//*****Esta Disponivel*****//
function estaDisponivel(req, res, connection, callback)
{
	let evento	= req.body.evento

	connection.query('SELECT DataInscricao, FimInscricao FROM `evento` WHERE ID = ?', evento, function (err, rows, fields)
	{
		if (!err)
		{
			var dataEvento = rows[0].DataInscricao;
			var dataFim = rows[0].FimInscricao;
			var dataCountdown = new Date(dataEvento).getTime();
			var dataCountdown2 = new Date(dataFim).getTime();
			var agora = new Date().getTime();
			var distancia = dataCountdown - agora;
			var distancia2 = agora - dataCountdown2;

			(distancia <= 0 && distancia2 <= 0) ? callback(res, true) : callback(res, false);
		}
		else
		{
			//console.log('Error while performing Query');
			//console.log(err);
			callback(res, false);
		}
	});
}

//*****Finalizar Evento*****//
function finalizarEventoDB(req, res, connection, callback)
{
	let post	= req.body

	if (req.session.usuarioLogado.Admin)
	{
		connection.query('UPDATE `evento` SET Finalizado = 1 WHERE ID = ?', post.eventoID, function (err, rows, fields)
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

//*****Excluir Evento*****//
function excluirEventoDB(req, res, connection, callback)
{
	let post	= req.body

	if (req.session.usuarioLogado.Admin)
	{
		connection.query('DELETE FROM `evento` WHERE ID = ?', post.ID, function (err, rows, fields)
		{
			if (!err)
			{
				connection.query('DELETE FROM `pessoa-evento` WHERE IDEvento = ?', post.ID, function (err, rows, fields)
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
		});
	}
	else
	{
		callback(res, false);
	}
}

//*****Excluir Usuario*****//
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

//*****Cadastrar Pontuacao*****//
function cadastrarPontucaoDB(req, res, connection, callback)
{
	let post	= req.body

	var controle = true;
	if (req.session.usuarioLogado.Admin)
	{
		connection.query('UPDATE `evento` SET fatorKevento = ? WHERE ID = ?', [post.fatork, post.eventoID], function (err, rows, fields)
		{
			if (!err)
			{
				connection.query('UPDATE `evento` SET subdesc = ? WHERE ID = ?', [post.subdesc, post.eventoID], function (err, rows, fields)
				{
					if (!err)
					{
						connection.query('UPDATE `evento` SET distancia = ? WHERE ID = ?', [post.distancia, post.eventoID], function (err, rows, fields)
						{
							if (!err)
							{

								var promessa = new Promise(function (resolve, reject)
								{
									post.pessoas.forEach(function (elem, index, array)
									{
										connection.query('UPDATE `pessoa-evento` SET fatorKPessoaEvento = ? WHERE IDEvento = ? AND listaNegraEvento = 0', [post.fatork, post.eventoID], function (err, rows, fields)
										{
											if (!err)
											{
												//Se for o ultimo, resolve a promessa
												if (index == (array.length - 1))
												{
													resolve();
												}
											}
else
{
												controle = false;
											}
										});
									});
								});

								promessa.then(function ()
								{
									connection.query('UPDATE `evento` SET Finalizado = 1 WHERE ID = ?', post.eventoID, function (err, rows, fields)
									{
										connection.release();

										if (!err)
										{
											callback(res, controle);
										}
										else
										{
											controle = false;
										}
									});
								});


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
				});
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

//*****Monta Ranking*****//
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

export
{ criarEventoDB, editarEventoDB, getEventos, confirmarEventoDB, cancelarEventoDB, estaDisponivel, excluirEventoDB, excluirUsuarioDB, cadastrarPontucaoDB, montaRanking, finalizarEventoDB }
