module.exports = (app, fs) => {
	const https = require('https')
	const distance = require('../fn/distance.js')
	const Coupon = require('../class/coupon.js')
	const HTMLParser = require('node-html-parser')
	
	const scrapeSingleCare = (req) => {
		if (req.params.attempt == '4') {
			return emptyPromise();
		}
		
		return new Promise((resolve) => {
			try {
				var jsonString = ''
				
				const quantity = (() => {
					if (req.params.form == 'Bottle') {
						return req.params.dosage.split(/[^0-9]/)[0];
					} else {
						return req.params.quantity;
					}
				})();
				
				const options = {
					host: 'webapi.singlecare.com',
					path: `/api/pbm/tiered-pricing/${req.params.ndc}?quantity=${quantity}&zipCode=${req.params.zip}`
				}
				
				const request = https.request(options, response => {
					response.on('data', chunk => {
						jsonString += chunk
					})
					
					response.on('end', () => {
						const result = JSON.parse(jsonString).Result
						
						if (result) {
							resolve(processSingleCare(result.PharmacyPricings))
						} else {
							resolve({
								error: 'No results',
								coupons: []
							})
						}
					})
				})
				
				request.on('error', (e) => {
					resolve({
						error: e.toString(),
						coupons: []
					})
				})
				
				request.on('timeout', () => {
					resolve({
						error: 'timed out',
						coupons: []
					})
				})
				
				request.setTimeout(10000)
				request.end()
			} catch (e) {
				resolve({
					error: e.toString(),
					coupons: []
				})
			}
		})
	};
	
	const scrapeInsideRx = (req) => {
		if (req.params.attempt == '2') {
			return emptyPromise();
		}
		
		return new Promise((resolve) => {
			try {
				var jsonString = ''
				
				const quantity = (() => {
					if (req.params.form == 'Bottle') {
						return req.params.dosage.split(/[^0-9]/)[0];
					} else {
						return req.params.quantity;
					}
				})();
				
				const options = {
					'hostname': 'services.insiderx.com',
					'path': '/api/pricing/v1/region/people?limit=10&index=0&accessCode=www.google.com',
					'method': 'POST',
					'headers': { 'x-api-key': 'ObQ2GHArue3pYnh7TmxDf1bBGjYGV6H938UoqZNv' }
				};
				
				const request = https.request(options, (response) => {
					response.on('data', chunk => {
						jsonString += chunk
					});
					
					response.on('end', () => {
						resolve(processInsideRx(JSON.parse(jsonString).pharmacies, req.params.name, req, req.params.ndc));
					})
				});
				
				request.on('error', (e) => {
					resolve({
						error: e.toString(),
						coupons: []
					})
				})
				
				request.on('timeout', () => {
					resolve({
						error: 'timed out',
						coupons: []
					})
				})
				
				request.setTimeout(10000)
				
				request.write(JSON.stringify({
					'ndc': req.params.ndc,
					'quantity': quantity,
					'zip': req.params.zip
				}));
				
				request.end();
			} catch (e) {
				resolve({
					error: e.toString(),
					coupons: []
				})
			}
		});
	};
	
	const scrapeRxSpark = (req) => {
		if (req.params.attempt == '3') {
			return emptyPromise();
		}
		
		return new Promise((resolve) => {
			try {
				var html = ''
				
				var options = { host: 'www.rxspark.com' }
				
				if (req.params.form == 'Bottle') {
					options.path = `/${req.params.brandSlug}?ndc=${req.params.ndc}&brand=${req.params.branding}&location=${req.params.zip}&drug-name=${encodeURIComponent(req.params.drug)}`
				} else {
					options.path = `/${req.params.brandSlug}?ndc=${req.params.ndc}&qty=${req.params.quantity}&brand=${req.params.branding}&location=${req.params.zip}&drug-name=${encodeURIComponent(req.params.drug)}`
				}
				
				const request = https.request(options, response => {
					response.on('data', chunk => {
						html += chunk
					})
					
					response.on('end', () => {
						root = HTMLParser.parse(html);
						const elements = root.querySelectorAll('.drugPrice');
						resolve(processRxSpark(elements, req));
					})
				})
		
				request.on('error', (e) => {
					resolve({
						error: e.toString(),
						coupons: []
					})
				})
				
				request.on('timeout', () => {
					resolve({
						error: 'timed out',
						coupons: []
					})
				})
				
				request.setTimeout(20000)
				request.end()
			} catch (e) {
				resolve({
					error: e.toString(),
					coupons: []
				})
			}
		});
	};
	
	const scrape = (req) => {
		return new Promise(async (resolve, reject) => {
			try {
				const puppeteer = require('puppeteer-extra')
				const StealthPlugin = require('puppeteer-extra-plugin-stealth')
				const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
				puppeteer.use(StealthPlugin())		
				puppeteer.use(AdblockerPlugin({ blockTrackers: true }))
				
				const browser = await puppeteer.launch({ headless: true, args: [
						'--no-sandbox', 
						'--disable-setuid-sandbox',
						'--disable-dev-shm-usage',
						'--disable-accelerated-2d-canvas',
						'--no-first-run',
						'--no-zygote',
						'--single-process',
						'--disable-gpu'
					]
				})
				
				const page = await browser.newPage()
				await page.setRequestInterception(true);
				
				page.on('request', (request) => {
					if (request.resourceType() == 'stylesheet' || request.resourceType() == 'font' || request.resourceType() == 'image') {
						request.abort();
					} else {
						request.continue();
					}
				});
				
				const responses = {}
				
				//BuzzRx
				try {
					const quantity = req.params.form == 'Bottle' ? '1' : req.params.quantity;
					const url = `https://drug-service.buzzrx.com/api/v2/drug/prices?name=${req.params.drug}&qty=${quantity}&ndc=${req.params.ndc}&drug_type=${req.params.branding}&zip=${req.params.zip}&rxgrp=SAVE400&key=TJG33Q3HvGTPqZKNnXjvdVJM7zeGwDuckUpKuVwrrzaNJ9qsJB&isBuzz=true`
					await page.goto(url, { waitUntil: 'domcontentloaded' });
					
					try {
						var data = await page.evaluate(() => document.querySelector('pre').innerHTML)
					} catch (x) {
						throw 'Empty or invalid response'
					}
					
					data = JSON.parse(data).data
					responses.buzzRx = processBuzzRx(data, req)
				} catch (e) {
					responses.buzzRx = {
						error: e.toString(),
						coupons: []
					}
				}
				
				//GoodRx
				var labelOverride = req.params.branding === 'B' ? req.params.brandSlug : req.params.slug;
				labelOverride = labelOverride.replace('-besylate', '');
				const dosage = req.params.dosage.toLowerCase();
				const url = `https://www.goodrx.com/${req.params.brandSlug}?optly-test-group=price_page_refresh_1_5&slug=${req.params.brandSlug}&form=${req.params.form}&dosage=${dosage}&quantity=${req.params.quantity}&label_override=${labelOverride}`;
				
				try {
					const cookies = [{
					  'name': 'grx_preferred_pharmacy_id',
					  'value': '-1'
					},{
					  'name': 'grx_location',
					  'value': `{"location":{"postalCode":"${req.params.zip}","country":"US"}}`
					}];
					
					await page.setCookie(...cookies);
					await page.goto(url, { waitUntil: 'domcontentloaded' });
					await page.goto(url, { waitUntil: 'domcontentloaded' });
					
					var html = await page.evaluate(() => document.querySelector('body').innerHTML);
					var root = HTMLParser.parse(html);
					html = null;
					const elements = root.querySelectorAll('a[data-qa=pharmacy-row]');
					
					if (elements.length) {
						// New
						
						const retail = root.querySelectorAll('[data-qa="drug-price-drug-attribute"]>div>div+span')[1].innerText.replace(/[^0-9.]/g, '');
						root = null;
						
						responses.goodRx = {
							retail: retail,
							coupons: elements.map(row => new Coupon(
								row.querySelector('[data-qa=pharmacy-row-price]').innerText,
								row.querySelector('[data-qa=pharmacy-row-pharmacy-block]').innerText,
								`https://www.goodrx.com${row.getAttribute('href')}`,
								'GoodRx'
							)).filter(c => c).filter(c => Coupon.isValid(c.pharmacy))
						};
					} else {
						// Old
						
						var choices = null, retail = 0;
						
						fs.readFile(`./public/data/drug/grx/${req.params.brandSlug}.json`, 'utf8', (err, data) => {
							if (data) {
								choices = data
							}
						})
						
						if (choices === null) {
							var js;
							
							try {
								js = root.querySelector('div#modal-root+script+script').innerHTML
							} catch(x) {
								throw 'No script returned'
							}
							
							js = js.replace('window.__state__=', '').replace(/undefined/g, 'null')
							js = js.substring(0, js.length - 1)
							js = JSON.parse(js)
							choices = js.reduxAsyncConnect.catchAllPageData.drugConcepts.choices;
							retail = js.reduxAsyncConnect.catchAllPageData.prices.avg_cash_price
							js = null;
							
							fs.writeFile(`./public/data/drug/grx/${req.params.brandSlug}.json`, JSON.stringify(choices), err => {
								if (err) {
									console.error(err)
								}
							})
						}
						
						const id = findID(choices, req);
						const quantity = req.params.form == 'Bottle' ? '1' : req.params.quantity;
						const query = `?location=${req.params.lat},${req.params.lng}&location_type=LAT_LNG&quantity=${quantity}`;
						await page.goto(`https://www.goodrx.com/api/v4/drugs/${id}/prices${query}`, { waitUntil: 'domcontentloaded' });
						
						try {
							var json = await page.evaluate(() => document.querySelector('pre').innerHTML)
							json = JSON.parse(json)
							json.avgCashPrice = retail
						} catch (x) {
							throw 'Empty or invalid response'
						}
						
						responses.goodRx = processGoodRx(json)
					}
				} catch (e) {
					responses.goodRx = {
						error: e.toString(),
						coupons: [],
						url: url
					}
				}
				
				//RxSaver
				try {
					const quantity = (() => {
						if (req.params.form == 'Bottle') {
							return req.params.dosage.split(/[^0-9]/)[0];
						} else {
							return req.params.quantity;
						}
					})();
				
					const url = `https://www.rxsaver.com/api/v3/priceListItems?ndc=${req.params.ndc}&quantity=${quantity}&daysSupply=${quantity}&zipCode=${req.params.zip}&distance=20&noLocations=true&filterMode=PREFERRED`
					await page.goto(url, { waitUntil: 'domcontentloaded' });
					var json = await page.evaluate(() => document.querySelector('pre').innerHTML);
					json = JSON.parse(json)
					
					responses.rxSaver = {
						coupons: json.priceListItems.map((item) => new Coupon(
							item.price.discounted, 
							item.name,
							`https://www.rxsaver.com/api/v3/discountcard?providerId=${item.providerId}&sponsorCode=${item.id}&pharmacyId=${item.pharmacyId || ''}&pricingExtras=${item.pricingExtras || ''}&ndc=${req.params.ndc}&quantity=${quantity}`,
							'RxSaver'
						)).filter(c => Coupon.isValid(c.pharmacy))
					}
				} catch (e) {
					responses.rxSaver = {
						error: e.toString(),
						coupons: []
					}
				}
				
				await browser.close()
				resolve(responses)
			} catch (e) {
				reject({
					error: e.toString()
				})
			}
		})
	};
	
	const findID = (data, req) => {
		var min = Number.MAX_SAFE_INTEGER, id
		
		for (choice of data.filter(d => d.label_type.substring(0, 1) == req.params.branding)) {
			if (req.params.form == 'Bottle' && choice.singular_display.substring(0, 6) != 'bottle') {
				continue;
			} else if (choice.dosage.name == req.params.dosage.toLowerCase()) {
				return choice.id;
			}
			
			const compare = `${req.params.form} of ${req.params.drug} ${req.params.dosage}`
			const dist = distance(compare, choice.singular_display)
			
			if (dist < min) {
				min = dist
				id = choice.id
			}
		}
		
		return id;
	};
	
	const processGoodRx = (data) => {
		return {
			retail: data.avgCashPrice,
			coupons: data.results.map((result) => {
				for (priceObj of result.prices.filter(price => price.type == "COUPON")) {
					const url = `https://goodrx.com${priceObj.url}`
					
					return new Coupon(priceObj.price, result.pharmacy.name, url, 'GoodRx')
				}
			}).filter(c => c).filter(c => Coupon.isValid(c.pharmacy))
		};
	};
	
	const processBuzzRx = (data, req) => {
		return {
			coupons: data.map((price) => {
				const brxDosage = req.params.dosage.toLowerCase()
				const brxForm = req.params.form.toLowerCase()
				const brxName = req.params.drug
				const brandString = req.params.branding === 'B' ? 'Brand' : 'Generic';
				const di = `{"price":"$${price.network_price}","drug_info":"${brandString}, ${brxDosage}, ${req.params.quantity} ${brxForm}","drug_name":"${brxName}","image_logo":"","pharmacy_name":"${price.PharmacyName}","quantity":${req.params.quantity},"logo":"","strength":"${brxDosage}","form":"${brxForm}","pharmacy":"${price.pharmacyName}","drugName":"${brxName}","ndc":"${req.params.ndc}","drugType":"${req.params.branding}","drugTypeName":"${brandString}","zip":"${req.params.zip}","drug_url":"${req.params.brandSlug}"}`;
				const url = `https://www.buzzrx.com/discount-coupon?di=${Buffer.from(di).toString('base64')}&layout=nonav`;
				
				if (Coupon.isValid(price.PharmacyName)) {
					return new Coupon(price.network_price, price.PharmacyName, url, 'BuzzRx');
				}
			}).filter(c => c)
		};
	};
	
	const findStrengths = (data, form) => {
		var min = Number.MAX_SAFE_INTEGER;
		var strengths;
		
		for (f of data) {
			const dist = distance(form, f.Form);
			
			if (dist < min) {
				min = dist;
				strengths = f;
			}
		}
		
		return strengths;
	};
	
	const findQuantities = (validStrs, dosage) => {
		var min = Number.MAX_SAFE_INTEGER;
		var quantities;
		
		for (s of validStrs) {
			const dist = distance(dosage, s.Str);
			
			if (dist < min) {
				min = dist;
				quantities = s.ValidQtys;
			}
		}
		
		return quantities;
	};
	
	const findDrugDosageID = (validQtys, quantity, dosage) => {
		for (q of validQtys) {
			const liquidQty = `${q.Qty} of ${q.Str}`;
			
			if (q.Qty == quantity || liquidQty.toLowerCase() == dosage.toLowerCase()) {
				return q.DrugDosageID
			}
		}
		
		for (q of validQtys) {
			return q.DrugDosageID
		}
	};
	
	const processInsideRx = (pharmacies, drug, req, ndc) => {
		return {
			coupons: pharmacies ? pharmacies.map(pharmacy => new Coupon(
				pharmacy.price.discounted,
				pharmacy.name,
				encodeURL(pharmacy, drug, req, ndc),
				'InsideRx'
			)).filter(c => Coupon.isValid(c.pharmacy)) : [],
			ndc: ndc
		};
	};
	
	const processSingleCare = (data) => {
		const Coupon = require('../class/coupon.js')
		var coupons = []
		
		for (pp of data) {
			for (price of pp.Prices) {
				if (Coupon.isValid(pp.Pharmacy.Name)) {
					coupons.push(new Coupon(price.Price, pp.Pharmacy.Name, generateURL(price), 'SingleCare'));
				}
			}
		}
		
		return {
			coupons: coupons
		};
	};
	
	const generateURL = (price) => {
		return `/api/contact/create?pid=${price.PartnerUser}&pPass=${price.PartnerPassword}&contactTypeId=65&prospectId=225292074&src=direct&med=singlecare&cgn=null&IsLoyaltyMember=false&locale=en-US&domainURL=https://www.singlecare.com`;
	};
	
	const findName = (elements, branding) => {
		for (el of elements) {
			if (el.getAttribute('data-brand') == branding) {
				return el.getAttribute('data-search');
			}
		}
		
		for (el of elements) {
			return el.getAttribute('data-search');
		}
	};
	
	const findPDA = (pdaList, req) => {
		var min = Number.MAX_SAFE_INTEGER, ret;
		
		for (pda of pdaList) {
			const fmt = `${req.params.drug.substring(0, 6)}+${req.params.form}+${req.params.dosage}`;
			const dist = distance(pda, fmt, true);
			
			if (dist < min) {
				min = dist;
				ret = pda;
			}
		}
		
		return ret;
	};
	
	const processRxSpark = (elements, req) => {
		const Coupon = require('../class/coupon.js');
		
		return {
			coupons: elements.map((el) => {
				const pharmacy = pharmacyName(el);
				const href = el.querySelector('.pricePart a').getAttribute('href');
				const url = `https://www.rxspark.com${href}`;
				const price = el.querySelector('.typePart span').textContent;
				
				return new Coupon(price, pharmacy, url, 'RxSpark');
			}).filter(c => Coupon.isValid(c.pharmacy))
		};
	};
	
	const pharmacyName = (el) => {
		if (el.querySelector('h5 a img')) {
            return el.querySelector('h5 a').getAttribute('href').replace('/pharmacy/', '');
        } else {
            return el.querySelector("a").textContent.replace(/\n/g, '').trim();
        }
	};
	
	const encodeURL = (pharmacy, drug, req, ndc) => {
		const params = {
			'c': pharmacy.code,
			'cl': pharmacy.name,
			'd': ndc,
			'dl': req.params.dosage,
			'f': req.params.form.toLowerCase(),
			'n': drug,
			'q': req.params.quantity,
			'ql': req.params.quantity,
			's': req.params.slug,
			'z': null
		};
		
		const enc = Buffer.from(JSON.stringify(params)).toString('base64');
		
		return `https://insiderx.com/savings-card-no-location/?q=${enc}`;
	};
	
	const emptyPromise = () => {
		return new Promise(resolve => resolve({ coupons: [], skipped: true }))
	};
	
	app.get('/api/v1/coupons/:drug/:ndc/:slug/:brandSlug/:branding/:form/:dosage/:quantity/:zip/:lat/:lng/:attempt/:rid', (req, res) => {
		try {
			req.connection.setTimeout(100000)
			
			Promise.all([scrape(req), scrapeSingleCare(req), scrapeInsideRx(req), scrapeRxSpark(req)]).then((data) => {
				data[0].singleCare = data[1];
				data[0].insideRx = data[2];
				data[0].rxSpark = data[3];
				
				res.send({
					data: data[0],
					rid: req.params.rid
				});
			});
		} catch (e) {
			res.send({ error: e.toString() })
		}
	});
};
