module.exports = class Strength {
	constructor(strength) {
		this.strength = strength
		this.quantities = []
		this.ndc = null
	}
	
	toString() {
		return this.strength
	}
}
