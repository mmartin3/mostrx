module.exports = (app, fs) => {
	const routes = [
		require('./variations'),
		require('./coupons'),
		require('./goto'),
		require('./search')
	]

	for (route of routes) {
		route(app, fs);
	}
};
