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
function getPostagemDB(req, res, connection, callback) {
	connection.post('',
	{
		comando: 'junta',
		parametros:
		{
			tabelaInicial: { tabela: 'postagens', apelido: 'post', chave: {} },
			relacionamentos:
			[
				{ tabela: 'eventos', apelido: 'evt', origem: 'post.EventoID', destino: 'ID' },
				{ tabela: 'pessoas', apelido: 'adm', origem: 'post.AdminID', destino: 'ID' }
			]
  		}
	})
	.then((answer) =>
	{
		answer = answer.data
		
		if(answer == false)
		{
			callback(res, false)
		}
		else
		{
			let retorno = answer.map(linha =>
			{
				let linhaRetornar = {}

				for(let campo in linha.post)

					linhaRetornar[campo] = linha.post[campo]

				linhaRetornar.Nome      = linha.evt.Nome
				linhaRetornar.AdminFoto = linha.adm.Foto

				return linhaRetornar
			})

			callback(res, retorno)
		}
	})
	.catch((erro) => console.log(erro))
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

export { criarPostagemDB, excluirPostagemDB, getPostagemDB, editarInfoDB }
