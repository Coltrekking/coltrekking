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
const handleDatabase    = (req, res, call) =>
{
	pool.getConnection(function (err, connection)
    {
		if (err)
        {
			res.json({ "code": 100, "status": "Error in connection database" });
			return false;
		}

		call(req, res, connection);

		connection.on('error', function (err)
        {
			res.json({"code": 100, "status": "Error in query"});
			return false;
		});
	});
}

export { pool, handleDatabase }