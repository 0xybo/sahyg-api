class Route {
	constructor(/** @type {import('../index.js')} */ APIServer) {
		this.APIServer = APIServer;
		this.express = APIServer.server.express;
		this.routeConfig = this.APIServer.config.get("routes")?.[this.constructor.name.toLocaleLowerCase()];

		this.logger = this.APIServer.loggerStore.new("Route:" + this.constructor.name);
	}
	setGetResponse(path, ...callback) {
		if (!(path instanceof Array)) path = [path];

		let paths = this.routeConfig?.paths || {};
		path = path.filter((p) => (p in paths ? paths[p].enabled : false) || (this.logger.warn(`Path '${p}' is disabled`), false));

		callback = callback.map((cb) => {
			return function (req, res, next, ...args) {
				try {
					cb(req, res, next, ...args);
				} catch (e) {
					this.logger.error(e);
					res.APIResponse.setStatus("SERVER_ROUTE_ERROR").send();
				}
			};
		});

		if (path.length) this.express.get(path, ...callback);
	}
	setPostResponse(path, ...callback) {
		if (!(path instanceof Array)) path = [path];

		let paths = this.routeConfig?.paths || {};
		path = path.filter((p) => (p in paths ? paths[p].enabled : false) || (this.logger.warn(`Path '${p}' is disabled`), false));

		callback = callback.map((cb) => {
			return function (req, res, next, ...args) {
				try {
					cb(req, res, next, ...args);
				} catch (e) {
					this.logger.error(e);
					res.APIResponse.setStatus("SERVER_ROUTE_ERROR").send();
				}
			};
		});

		if (path.length) this.express.post(path, ...callback);
	}
	setResponse(path, ...callback) {
		this.setGetResponse(path, ...callback);
		this.setPostResponse(path, ...callback);
	}
}

module.exports = Route;
