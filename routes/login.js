const Route = require("../lib/route");

class Login extends Route {
	constructor(/** @type {import('../index.js')} */ APIServer) {
		super(APIServer);

		this.setPostResponse("/login", this.login.bind(this));
	}
	async login(
		/** @type {import('express').Request}*/ req,
		/** @type {import('express').Response}*/ res,
		/** @type {import('express').NextFunction}*/ next
	) {
		if (typeof req.body.login != "string" || typeof req.body.password != "string")
			return res.APIResponse.setStatus("NO_LOGIN_INFORMATION").send();
		if (req.APIRequest.userExists) return res.APIResponse.setStatus("ALREADY_LOGGED_IN").send();

		let user;
		if (req.body.login.includes("@")) user = await this.APIServer.db.User({ email: req.body.login });
		else user = await this.APIServer.db.User({ username: req.body.login });

		if (!user) return res.APIResponse.setStatus("USER_NOT_FOUND").send();
		if (!user.enabled) return res.APIResponse.setStatus("DISABLED_ACCOUNT").send();
		if (!(await user.checkPassword(req.body.password))) return res.APIResponse.setStatus("INVALID_PASSWORD").send();

		// TODO 2 authentication
		req.session.user = user._id;

		user.loginHistory.push({
			date: new Date(Date.now()),
			ip: req.ip,
		});
		user.save();

		return res.APIResponse.setStatus("LOGGED_IN").setContent({ token: req.sessionID }).send();
	}
	async 
}

module.exports = Login;