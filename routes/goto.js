module.exports = (app, fs) => {
	app.get('/coupon/:enc', (req, res) => {
		const url = Buffer.from(req.params.enc, 'base64').toString()
		const redirect = url => `<html><head><meta http-equiv="refresh" content='0; URL=${url}' /></head><body></body></html>`
		
		if (url.startsWith('/api/contact/create')) {
			const https = require('https')

			const options = {
				host: 'webapi.singlecare.com',
				path: encodeURI(url)
			}
			
			var jsonString = ''
			
			const request = https.request(options, response => {
				response.on('data', chunk => {
					jsonString += chunk
				})
				
				response.on('end', () => {
					res.send(redirect(JSON.parse(jsonString).Result.PDFUrl))
				})
			})
			
			request.on('error', error => {
				res.send(error.toString())
			})
			
			request.end();
		} else {
			res.send(redirect(url))
		}
	});
};
