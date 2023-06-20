import * as moment	from 'moment'

//*****Adiciona Evento ao DB*****//
function criarEventoDB(req, data, connection, callback) {
	if (req.session.usuarioLogado.Admin) {
		connection.query('INSERT INTO evento SET ?', data, function (err, rows, fields) {
			if (!err) {
				connection.query('UPDATE `pessoa` SET ListaNegra = 0 WHERE ListaNegra = 2', function (err, rows, fields) {
					if (!err) {
						connection.query('UPDATE `pessoa` SET ListaNegra = 2 WHERE ListaNegra = 1', function (err, rows, fields) {
							if (!err) {
								connection.query('UPDATE `pessoa-evento` SET listaNegraEvento = 3 WHERE listaNegraEvento = 2', function (err, rows, fields) {
									if (!err) {
										connection.query('UPDATE `pessoa-evento` SET listaNegraEvento = 2 WHERE listaNegraEvento = 1', function (err, rows, fields) {
											connection.release();

											if (!err) {
												callback(true);
											}
											else {
												callback(false);
											}
										});
									} else {
										callback(false);
									}
								});
							} else {
								callback(false);
							}
						});
					} else {
						callback(false);
					}
				});
			} else {
				callback(false);
			}
		});
	} else {
		callback(false);
	}
}

//*****Editar Evento no DB*****//
function editarEventoDB(req, data, connection, callback) {
	if (req.session.usuarioLogado.Admin) {
		connection.query('UPDATE evento SET ? WHERE ID = ?', [data, data.ID], function (err, rows, fields) {
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

//*****Get Eventos*****//
function getEventos(connection, callback) {
	connection.query('SELECT * FROM evento', function (err, rows, fields) {
		connection.release();

		if (!err) {
			var retorno = {
				eventos: rows.reverse(),
				//Pegar o fuso horario do servidor (para saber se eh +2(horario de verao) ou +3 (horario normal))
				fusoHorarioServidor: new Date().getTimezoneOffset() * 60000, //Multiplicar com 60000 para converter minutos em milissigundos
				hora: new Date().getTime()
			};
			callback(retorno);
		} else {
			//console.log(err);
			callback(false);
		}
	});
}

//*****Confirmar Evento DB*****//
function confirmarEventoDB(data, connection, callback) {
	var post;

	//Verifica se evento esta disponivel para inscricao
	estaDisponivel(data.evento, connection, function (status) {
		//Se esta disponivel
		if (status) {
			//Verifica se o cara ta logado mesmo
			if (data.usuario) {
				//Verifica se o cara nao ja esta inscrito
				estaInscrito(data, connection, function (status) {
					//Se nao esta inscrito
					if (status) {
						//Datetime eh o horario correto, que ordena a posicao da inscricao
						let fusoHorarioServidor	= -3; //HORARIO DE BRASILIA
						var datetime = new Date().toISOString();

						datetime = datetime.split('T');
						datetime[1] = datetime[1].split('.')[0];
						datetime[1] = datetime[1].split(':');
						datetime[1][0] = String(parseInt(datetime[1][0]) + fusoHorarioServidor);
						datetime[1] = datetime[1].join(':');
						datetime = datetime.join(' ');

						//Horario certo so funciona para mostrar para o usuario o tempo, ele nao ordena, APENAS a variavel datetime ordena
						moment.locale("pt-br");
						horarioCerto = moment().add(fusoHorarioServidor, 'hours').format('LLL:ss');

						//Seta o post
						post = {
							IDPessoa: data.usuario,
							IDEvento: data.evento,
							Colocacao: 0,
							ListaEspera: 0,
							DataInscricao: horarioCerto,
							DataHoraInscricao: datetime
						};

						//verifica se o usuario nao esta na lista negra
						if (data.blacklist == 0) {
							//Adiciona pessoa ao evento
							connection.query('INSERT INTO `pessoa-evento` SET ?', post, function (err, rows, fields) {
								if (!err) {
									//Adicionar rg do usuario
									connection.query('UPDATE `pessoa` SET `rg` = ? WHERE ID = ?', [data.rg, post.IDPessoa], function (err, rows, fields) {
										if (!err) {
											connection.release();
											callback(true);
										} else {
											callback(false);
										}
									});
								} else {
									//console.log('this.sql', this.sql);
									//console.log(err);
									callback(false);
								}
							});
						}
						else {
							callback(false);
						}
					} else {
						callback(false);
					}
				});
			} else {
				callback(false);
			}
		} else {
			callback(false);
		}
	});
}

//*****Cancelar Evento*****//
function cancelarEventoDB(post, connection, callback) {
	if (post.usuario) {
		connection.query('DELETE FROM `pessoa-evento` WHERE IDEvento = ? AND IDPessoa = ?', [post.evento, post.usuario], function (err, rows, fields) {
			if (!err) {
				connection.release();
				callback(true);
			} else {
				//console.log('Error while performing Query');
				//console.log(err);
				callback(false);
			}
		});
	} else {
		callback(false);
	}
}

//*****Esta Disponivel*****//
function estaDisponivel(evento, connection, callback) {
	connection.query('SELECT DataInscricao, FimInscricao FROM `evento` WHERE ID = ?', evento, function (err, rows, fields) {
		if (!err) {
			var dataEvento = rows[0].DataInscricao;
			var dataFim = rows[0].FimInscricao;
			var dataCountdown = new Date(dataEvento).getTime();
			var dataCountdown2 = new Date(dataFim).getTime();
			var agora = new Date().getTime();
			var distancia = dataCountdown - agora;
			var distancia2 = agora - dataCountdown2;

			(distancia <= 0 && distancia2 <= 0) ? callback(true) : callback(false);
		} else {
			//console.log('Error while performing Query');
			//console.log(err);
			callback(false);
		}
	});
}

//*****Finalizar Evento*****//
function finalizarEventoDB(req, post, connection, callback) {
	if (req.session.usuarioLogado.Admin) {
		connection.query('UPDATE `evento` SET Finalizado = 1 WHERE ID = ?', post.eventoID, function (err, rows, fields) {
			connection.release();

			if (!err) {
				callback(true);
			}
			else {
				callback(false);
			}
		});
	} else {
		callback(false);
	}
}

//*****Excluir Evento*****//
function excluirEventoDB(req, post, connection, callback) {
	if (req.session.usuarioLogado.Admin) {
		connection.query('DELETE FROM `evento` WHERE ID = ?', post.ID, function (err, rows, fields) {
			if (!err) {
				connection.query('DELETE FROM `pessoa-evento` WHERE IDEvento = ?', post.ID, function (err, rows, fields) {
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
		});
	} else {
		callback(false);
	}
}

//*****Excluir Usuario*****//
function excluirUsuarioDB(req, post, connection, callback) {
	if (req.session.usuarioLogado.Admin) {
		connection.query('DELETE FROM `pessoa-evento` WHERE IDEvento = ? AND IDPessoa = ?', [post.IDEvento, post.ID], function (err, rows, fields) {
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

export { criarEventoDB, editarEventoDB, getEventos, confirmarEventoDB, cancelarEventoDB, estaDisponivel, excluirEventoDB, excluirUsuarioDB, cadastrarPontucaoDB, montaRanking }
