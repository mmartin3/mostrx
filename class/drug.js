module.exports = class Drug {
	constructor(name, isGeneric) {
		this.name = name
		this.isGeneric = isGeneric
		this.label = Drug.key(name, isGeneric)
		this.forms = {}
	}
	
	static key(name, isGeneric) {
		return `[${isGeneric ? 'GENERIC' : 'BRAND'}] ${name}`
	}
	
	toString() {
		return this.name
	}
}
