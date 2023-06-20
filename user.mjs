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
function addDB(req, connection, callback) {
	//Cria usuario com propriedades do req.session.usuarioLogado
	var usuario = new Usuario(req.session.usuarioLogado.Nome, req.session.usuarioLogado.Email, req.session.usuarioLogado.Foto, req.session.usuarioLogado.ID, 0, 1, 0, null, 0);

	//Adiciona ao DB de Pessoas
	connection.query('INSERT IGNORE INTO pessoa SET ?', usuario, function (err, rows, fields) {
		connection.release();

		if (!err) {
			// console.log(rows);
			callback(true);
		}
		else {
			// console.log(err);
			// console.log('Error while performing Query (ADICIONA AO DB PESSOAS)');
			callback(false);
		}
	});
}

//*****Pega Info do Usuario Logado*****//
function pegaInfoUsuarioLogado(req, connection, callback) {
	connection.query('SELECT * FROM pessoa WHERE ID = ?', req.session.usuarioLogado.ID, function (err, rows, fields) {
		connection.release();

		if (!err) {
			//Retrieve info do DB
			try {
				req.session.usuarioLogado.FatorK = rows[0].FatorK;
				req.session.usuarioLogado.Posicao = rows[0].Posicao;
				req.session.usuarioLogado.ListaNegra = rows[0].ListaNegra;
				req.session.usuarioLogado.rg = rows[0].rg;
				req.session.usuarioLogado.Admin = rows[0].Admin;
			} catch (err) {
				console.log(err.message);
				callback(false);
			}

			//Realiza o callback
			callback(true);
		} else {
			callback(false);
			// console.log('Error while performing Query (PEGA INFO DB)');
		}
	});
}

export { Usuario, addDB, pegaInfoUsuarioLogado }
