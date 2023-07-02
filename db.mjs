import * as mysql	from 'mysql'

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
		pool.getConnection(function (err, connection)
		{
			if (err)
			{
				res.json({ "code": 100, "status": "Error in connection database" });
				return false;
			}

			action(req, res, connection, callback);

			connection.on('error', function (err)
			{
				res.json({"code": 100, "status": "Error in query"});
				return false;
			});
		});
	}
	else
		res.send(false)
}

export { pool, executa }