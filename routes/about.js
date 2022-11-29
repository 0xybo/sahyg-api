const Route = require("../lib/route");

class About extends Route {
	constructor(/** @type {import('../index.js')} */ APIServer) {
		super(APIServer);

		this.setGetResponse(["/about", "/", "/help"], this.about.bind(this));
	}
	async about(
		/** @type {import('express').Request}*/ req,
		/** @type {import('express').Response}*/ res,
		/** @type {import('express').NextFunction}*/ next
	) {
		let author = this.APIServer.config.get("author");
		let status = await this.APIServer.status();
		status.db = Object.entries(status.db).reduce((globalDBStatus, [dbName, dbStatus]) =>
			globalDBStatus == "DISCONNECTED" ? globalDBStatus : dbStatus == "CONNECTED" ? "CONNECTED" : "DISCONNECTED"
		);
		status = status.db == "CONNECTED" && status.api == "UP" ? "UP" : "DOWN";
		res.APIResponse.setContent({
			name: this.APIServer.config.get("name"),
			author: {
				name: author.shortName,
				discord: author.discord,
				email: author.email,
			},
			version: this.APIServer.config.package.version,
			description: this.APIServer.config.package.description,
			status,
		}).send();
	}
}

module.exports = About;
