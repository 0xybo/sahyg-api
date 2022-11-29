const jwt = require("jsonwebtoken");

class Errors {
	constructor(/** @type {import('../index')}*/ APIServer) {
		this.APIServer = APIServer;

		this.errorsData = this.APIServer.config.get("errors");

		this.errorsData.forEach((error) => {
			Object.defineProperty(this, error.errorCode, {
				value: error,
				writable: false,
			});
		});
	}
	// Error Responses
	jwtResponse(err, res) {
		err = this.jwt(err);
		return res.status(err.statusCode).send(err);
	}
	noTokenResponse(res) {
		let err = this.NO_AUTH_TOKEN;
		return res.status(err.statusCode).send(err);
	}
	invalidTokenResponse(res) {
		let err = this.INVALID_SESSION_TOKEN;
		return res.status(err.statusCode).send(err);
	}

	// Multiple errors datas
	jwt(err) {
		if (err instanceof jwt.TokenExpiredError) {
			return this.EXPIRED_AUTH_TOKEN;
		} else {
			return this.INVALID_AUTH_TOKEN;
		}
	}

	// Error Datas
}

module.exports = Errors;
