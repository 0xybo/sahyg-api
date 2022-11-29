const Route = require("../lib/route");

class User extends Route {
	constructor(/** @type {import('../index.js')} */ APIServer) {
		super(APIServer);

		this.setGetResponse("/user/:usernameOrId", this.user.bind(this));
		this.setGetResponse("/users", this.users.bind(this));
	}
	async user(/** @type {import('express').Request}*/ req, /** @type {import('express').Response}*/ res, /** @type {import('express').NextFunction}*/ next) {
		let user;
		if (req.params.usernameOrId.length == 24 && !isNaN(Number("0x" + req.params.usernameOrId))) user = await this.APIServer.db.User({ _id: req.params.usernameOrId });
		else user = await this.APIServer.db.User({ username: req.params.usernameOrId });

		let result = {};
		let dbPerms = this.APIServer.config.get("dbPerms.user");
		for (const key in dbPerms) {
			if (!(key in dbPerms)) continue;
			if (user.shared.includes(key)) {
				result[key] = user[key];
				continue;
			}
			if (!req.APIRequest.userFetched) await req.APIRequest.fetchUser();
			if (await req.APIRequest.user.checkPermissions([dbPerms[key]])) result[key] = user[key];
		}
		res.APIResponse.setContent(result).send();
	}
	async users(/** @type {import('express').Request}*/ req, /** @type {import('express').Response}*/ res, /** @type {import('express').NextFunction}*/ next) {
		let users = await this.APIServer.db.User({}, { multiple: true });

		let result = [];
		let dbPerms = this.APIServer.config.get("dbPerms.user");
		for (let user of users) {
			let userResult = {};
			for (const key in dbPerms) {
				if (!(key in dbPerms)) continue;
				if (user.shared.includes(key)) {
					userResult[key] = user[key];
					continue;
				}
				if (!req.APIRequest.userFetched) await req.APIRequest.fetchUser();
				if (await req.APIRequest.user.checkPermissions([dbPerms[key]])) userResult[key] = user[key];
			}
			result.push(userResult);
		}
		res.APIResponse.setContent(result).send();
	}
}

module.exports = User;
