class APIResponse {
	success = true;
	statusName = "OK";
	statusCode = 200;
	details = null;
	message = "";
	content = null;
	constructor(
		/** @type {import('../index')}*/ APIServer,
		/** @type {import('express').Request}*/ req,
		/** @type {import('express').Response}*/ res,
		/** @type {import('express').NextFunction}*/ next
	) {
		this.APIServer = APIServer;
		this.APIRequest = req.APIRequest;
		this.expressReq = req;
		this.expressRes = res;
		this.expressNext = next;
		this.errors = APIServer.errors;

		this.loggedUser = req.APIRequest.user.username;
		this.loggedSource = req.APIRequest.tokenSource;

		res.APIResponse = this;
	}
	async asyncConstructor() {
		this.expressNext();
	}
	setContent(content) {
		this.content = content;
		return this;
	}
	setDetails(details) {
		this.details = details;
		return this;
	}
	setDetail(detailName, detailValue) {
		this.details = this.details || {};
		this.details[detailName] = detailValue;
		return this;
	}
	setStatus(statusNameOrCode, details = null) {
		let status = this.APIServer.config.get("status");
		status = status.find((s) => s.statusName == statusNameOrCode || s.statusCode == statusNameOrCode);

		if (!status) throw new Error("Invalid status");

		this.success = status.success;
		this.statusName = status.statusName;
		this.statusCode = status.statusCode;
		this.message = status.message;
		this.details = details;
		return this;
	}
	send() {
		this.expressRes.status(this.statusCode).send({
			success: this.success,
			status: this.statusName,
			statusCode: this.statusCode,
			message: this.message,
			details: this.details,
			content: this.content,
			loggedWith: {
				name: this.loggedUser,
				source: this.loggedSource || undefined,
				token: this.APIRequest.token,
			},
		});
		return true;
	}
}

module.exports = APIResponse;
