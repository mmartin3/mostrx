module.exports = class Form {
	constructor(name) {
		this.name = name
		this.strengths = {}
	}
	
	toString() {
		return this.name
	}
}
