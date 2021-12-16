module.exports = (app, fs) => {
	require('dotenv').config({path: '.env'})
	
	app.get('/api/v1/drug/search/:term', (req, res) => {
		const MongoClient = require('mongodb').MongoClient
		const levenshtein = require('js-levenshtein')
		const url = `mongodb+srv://mostrx:${process.env.DB_PASSWORD}@cluster0.p222a.mongodb.net/`
		
		MongoClient.connect(url, function(connectErr, db) {
			if (connectErr || !db) {
				res.send({
					error: connectErr,
					results: [],
				})
			} else {				
				var dbo = db.db("mostrx")
				var query = { name: new RegExp(req.params.term, "i") }
				
				dbo.collection("drugs").find(query).toArray(function(findErr, result) {
					db.close()
					
					result.sort(function(a, b) {
						levenshtein(b, req.params.term) - levenshtein(a, req.params.term)
					})
					
					res.send({
						error: connectErr || findErr,
						results: result,
						query: req.params.term
					})
				});
			}
		});
	});
};
