const Route = require("../lib/route");

class Error extends Route {
	constructor(/** @type {import('../index.js')} */ APIServer) {
		super(APIServer);

		this.setResponse("*", this.error404.bind(this));
	}
	error404(/** @type {import('express').Request}*/ req, /** @type {import('express').Response}*/ res, /** @type {import('express').NextFunction}*/ next) {
		this.logger.debug(`Request rejected : 404_NOT_FOUND (IP: ${req.ip})`);
		res.status(404).send(this.APIServer.config.get("messages.404").join("\n"));
	}
}

module.exports = Error;
