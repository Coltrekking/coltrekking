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

export { criarPostagemDB, excluirPostagemDB, getPostagemDB }
