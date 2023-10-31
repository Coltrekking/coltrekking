import * as mysql	from 'mysql'
import axios        from 'axios'

const url_db     = 'url'
const conexao_db = axios.create({ baseURL: url_db })

const pool  = mysql.createPool
({
	connectionLimit: 10000,
	host: 'localhost',
	user: 'admin',
	password: 'coltec',
	database: 'coltrekking',
	debug: false
});

// Conecta ao DB
const executa	= (req, res, action, callback) =>
{
	if(req.session.usuarioLogado.ID)
	{
		action(req, res, conexao_db, callback);
	}
	else
		res.send(false)
}

export { pool, executa }