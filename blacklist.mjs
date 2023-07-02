/**
 	Na tabela `pessoa`, quando o admin adiciona um usuario a lista negra, a coluna "ListaNegra" recebe 1.
	Na tabela `pessoa`, quando o admin cria um evento, todos que possui 1 na "ListaNegra" recebe o numero 2
	E todos que possuem que possui 2 na "ListaNegra" recebe 0 (saem da lista negra)
	Usuarios que nao possuirem 0, nao poderam se inscrever em nenhum evento
	
	Na tabela `pessoa-evento`, o usuario terá 1 na coluna "listaNegraEvento" quando o admin adiciona-la na lista negra
	Na tabela `pessoa-evento`, o usuario terá 2 na coluna "listaNegraEvento" quando o um evento for criado.
	Quando a coluna "listaNegraEvento" for = 1, então a situacao do usuario eh bloqueado
	Quando a coluna "listaNegraEvento" for = 2, então a situacao do usuario eh livre
**/
//*****Adicionar usuario na lista negra*****//
function adicionarListaNegraDB(req, post, connection, callback) {
	if (req.session.usuarioLogado.Admin) {
		connection.query('UPDATE `pessoa-evento` SET listaNegraEvento = 1 WHERE IDEvento = ? AND IDPessoa = ?', [post.IDEvento, post.ID], function (err, rows, fields) {
			if (!err) {
				connection.query('UPDATE `pessoa` SET ListaNegra = 1 WHERE ID = ?', post.ID, function (err, rows, fields) {
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


/**
	Remover usuario da lista negra
**/
function removerListaNegraDB(req, post, connection, callback) {
	if (req.session.usuarioLogado.Admin) {
		connection.query('UPDATE `pessoa-evento` SET listaNegraEvento = 0 WHERE IDEvento = ? AND IDPessoa = ?', [post.IDEvento, post.ID], function (err, rows, fields) {
			if (!err) {
				connection.query('UPDATE `pessoa` SET ListaNegra = 0 WHERE ID = ?', post.ID, function (err, rows, fields) {
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

export { adicionarListaNegraDB, removerListaNegraDB }
