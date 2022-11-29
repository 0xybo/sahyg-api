class MailManager {
	constructor(/** @type {import('../index')}*/ APIServer) {
		this.APIServer = APIServer;
		this.Mail = Mail.bind(this);
	}
	send() {} // TODO mail: send
}

class Mail {
	constructor(/** @type {MailManager} */ MailManager) {
		this.MailManager = MailManager;
		this.APIServer = MailManager.APIServer;
	}
	send() {} // TODO mail: send
}

module.exports = MailManager;
