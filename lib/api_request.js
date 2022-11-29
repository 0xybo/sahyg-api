const jwt = require("jsonwebtoken");
const { pathToRegexp } = require("path-to-regexp");

class APIRequest {
	authenticated = false;
	userFetched = false;
	userExists = null;
	username = null;
	userId = null;
	tokenSource = null;

	constructor(
		/** @type {import('../index')}*/ APIServer,
		/** @type {import('express').Request}*/ req,
		/** @type {import('express').Response}*/ res,
		/** @type {import('express').NextFunction}*/ next
	) {
		this.APIServer = APIServer;
		this.req = req;
		this.res = res;
		this.next = next;
		this.route;

		req.cookies = this.cookies = this.APIServer.utils.parseCookies(req.headers.cookie);
		req.APIRequest = this;
	}
	async asyncConstructor() {
		// if (!this.isAllowedOrigin()) return void (await this.sendError("UNAUTHORIZED_ORIGIN"));
		this.fetchRoute();
		if (!this.route) return void this.notFound();
		if (!(await this.validToken())) return;

		this.next();
	}
	async sendError(name) {
		// TODO request send error
	}
	async validToken() {
		try {
			let token = this.req.headers["authorization"]?.split(" ")[1];

			if (token) {
				let [err, data] = await new Promise((r) => jwt.verify(token, this.APIServer.config.get("env.SECRET"), (...args) => r(args)));
				if (err) {
					let e;
					if (err instanceof jwt.TokenExpiredError) {
						e = this.APIServer.errors.EXPIRED_AUTH_TOKEN;
					} else {
						e = this.APIServer.errors.INVALID_AUTH_TOKEN;
					}
					this.route.route.logger.debug(`Request rejected : ${e.errorCode} (IP: ${this.req.ip})`);
					return this.res.status(e.statusCode).send(e), false;
				}

				if (typeof data != "string")
					if ("data" in data) data = data.data;
					else {
						this.route.route.logger.debug(`Request rejected : SERVER_ERROR (IP: ${this.req.ip})`);
						this.res.status(err.statusCode).send(err);
					}

				if (data?.length == 24 && !isNaN(Number("0x" + data))) this.userId = data;
				else this.username = data;
				this.token = token;
				this.tokenSource = "BEARER";

				if (!(await this.checkPermissions())) {
					let e = this.APIServer.errors.UNAUTHORIZED;
					this.route.route.logger.debug(`Request rejected : UNAUTHORIZED (IP: ${this.req.ip})`);
					return this.res.status(e.statusCode).send(e), false;
				}

				this.route.route.logger.debug(
					`Request accepted (IP: ${this.req.ip}, userID: ${this.userId}, token: ${this.token}, source: ${this.tokenSource})`
				);
				return true;
			}

			let user = this.req.session?.user;
			if (user) {
				this.userId = user;
				this.tokenSource = "SESSION";

				if (!(await this.checkPermissions())) {
					let e = this.APIServer.errors.UNAUTHORIZED;
					this.route.route.logger.debug(`Request rejected : UNAUTHORIZED (IP: ${this.req.ip})`);
					return res.status(e.statusCode).send(e), false;
				}

				this.route.route.logger.debug(
					`Request accepted (IP: ${this.req.ip}, userID: ${this.userId}, token: null, source: ${this.tokenSource})`
				);
				return true;
			}

			token = this.req.cookies[this.sessionCookieName]?.split(":")[1]?.split(".")[0];
			if (token) {
				let session = await this.APIServer.db.Session({ _id: new RegExp(token) });

				if (session ? !session.user : true) {
					let e = this.APIServer.errors.INVALID_SESSION_TOKEN;
					this.route.route.logger.debug(`Request rejected : INVALID_SESSION_TOKEN (IP: ${this.req.ip}, token: ${token})`);
					return this.res.status(e.statusCode).send(e), false;
				}

				this.userId = session.user;
				this.token = token;
				this.tokenSource = "COOKIE";

				if (!(await this.checkPermissions())) {
					let e = this.APIServer.errors.UNAUTHORIZED;
					this.route.route.logger.debug(`Request rejected : UNAUTHORIZED (IP: ${this.req.ip})`);
					return res.status(e.statusCode).send(e), false;
				}

				this.route.route.logger.debug(
					`Request accepted (IP: ${this.req.ip}, userID: ${this.userId}, token: ${this.token}, source: ${this.tokenSource})`
				);
				return true;
			}

			if (await this.checkPermissions()) {
				this.route.route.logger.debug(`Request accepted (IP: ${this.req.ip}, user: 'guest', token: null, source: null)`);
				return true;
			}

			let e = this.APIServer.errors.UNAUTHORIZED;
			this.route.route.logger.debug(`Request rejected : UNAUTHORIZED (IP: ${this.req.ip})`);
			return this.res.status(e.statusCode).send(e), false;
			// let e = this.APIServer.errors.NO_AUTH_TOKEN;
			// this.route.route.logger.debug(`Request rejected : NO_AUTH_TOKEN (IP: ${this.req.ip})`);
			// return this.res.status(e.statusCode).send(e), false;
		} catch (e) {
			let err = this.APIServer.errors.SERVER_ERROR;
			this.route.route.logger.debug(`Request rejected : SERVER_ERROR (IP: ${this.req.ip})`);
			this.res.status(err.statusCode).send(err);
			return false;
		}
	}
	async fetchUser() {
		let user;
		if (this.userFetched) return false;
		if (this.userId) user = await this.APIServer.db.User({ _id: this.userId });
		else if (this.username) user = await this.APIServer.db.User({ username: this.username });
		if (user) {
			this.user = user;
			this.userFetched = true;
			this.userExists = true;
		} else {
			this.user = await this.APIServer.db.User();
			this.userFetched = true;
			this.userExists = false;
		}
		return true;
	}
	fetchRoute() {
		return (this.route = Object.values(this.APIServer.server.routes).reduce((previous, route) => {
			let path = Object.keys(route.config.paths).find(this.checkPath.bind(this.req.path));

			if (path) {
				if (!route.config.paths[path].enabled) return previous;
				route.config.permissions.push(...route.config.paths[path].permissions);
				return route;
			} else return previous;
		}, null));
	}
	async checkPermissions() {
		if (!this.userFetched) await this.fetchUser();
		return this.user.checkPermissions(this.route.config.permissions);
	}
	checkPath(path, route) {
		return pathToRegexp(route).test(path);
	}
	notFound() {
		this.APIServer.server.routes.error.route.error404(this.req, this.res, this.next);
	}
}

module.exports = APIRequest;
