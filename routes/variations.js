module.exports = (app, fs) => {
	app.get('/api/v1/drug/variations/:brand', (req, res) => {
		const slug = req.params.brand.toLowerCase().split(/[^a-z0-9]/).join('-')
		
		fs.readFile(`./public/data/drug/${slug}.json`, 'utf8', (err, data) => {
			res.send({
				variations: data ? JSON.parse(data) : {}
			})
		})
	});
};
