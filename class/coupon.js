module.exports = class Coupon {
	constructor(price, pharmacy, url, discounter) {
		if (typeof price === 'string') {
			price = price.replace(/[^0-9.]/g, '')
		}
		
		price = parseFloat(price)
		pharmacy = pharmacy.toUpperCase()
		pharmacy = pharmacy.replace('WAL-MART', 'WALMART')
		pharmacy = pharmacy.replace('CVS/PHARMACY', 'CVS')
		pharmacy = pharmacy.replace('CVS PHARMACY', 'CVS')
		pharmacy = pharmacy.replace('WALMART PHARMACY', 'WALMART')
		
		if (pharmacy === 'TARGET') {
			pharmacy = 'TARGET (CVS)'
		}			
		
		this.price = price
		this.pharmacy = pharmacy
		this.url = url
		this.discounter = discounter
	}
	
	static isValid(pharmacy) {
		pharmacy = pharmacy.toLowerCase()
		
		return !(pharmacy.includes("genius") ||
                pharmacy.includes("caremark") ||
                pharmacy.includes("express") ||
                pharmacy.includes("optum") ||
                pharmacy.includes("blink") ||
                pharmacy.includes("mail") ||
                pharmacy.includes("pack") ||
                pharmacy.includes("honeybee") ||
                pharmacy.includes("healthwarehouse") ||
                pharmacy.includes("health ware") ||
                pharmacy.includes("solve") ||
                pharmacy.includes("capsule") ||
                pharmacy.includes("amazon"))
	}
};
