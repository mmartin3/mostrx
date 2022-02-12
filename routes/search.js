module.exports = (app, fs) => {
	require('dotenv').config({path: '.env'})
	
	app.get('/api/v1/drug/search/:term', (req, res) => {
		const MongoClient = require('mongodb').MongoClient
		const url = `mongodb+srv://mostrx:${process.env.DB_PASSWORD}@cluster0.p222a.mongodb.net/`
		
		MongoClient.connect(url, function(connectErr, db) {
			if (connectErr || !db) {
				res.send({
					error: connectErr,
					results: [],
				})
			} else {
				var results = []				
				var coll = db.db("mostrx").collection("drugs")
				var query = { name: new RegExp('^' + req.params.term, "i") }
				
				coll.find(query).toArray(function(findErr, result) {
					results = result;
				});
				
				query = { name: new RegExp(req.params.term, "i") }
				
				coll.find(query).toArray(function(findErr, result) {
					db.close()
					
					results = results.concat(result.filter(drug => !results.map(r => r.slug).includes(drug.slug)))
					
					res.send({
						error: connectErr || findErr,
						results: results,
						query: req.params.term
					})
				});
			}
		});
	});
};
