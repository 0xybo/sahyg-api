const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const Utils = require("./lib/utils");
const Config = require("./lib/config");
const LoggerStore = require("./lib/logger");
const DB = require("./lib/db");
const Server = require("./lib/server");
const Errors = require("./lib/errors");

class APIServer {
	constructor() {
		this.utils = new Utils();
		this.config = new Config(["api.json"]);
		this.errors = new Errors(this);
		this.loggerStore = new LoggerStore({
			logPath: this.config.get("paths.logs"),
			maxNameLength: this.config.get("logging.maxNameLength"),
			maxTypeLength: this.config.get("logging.maxNameLength"),
		});
		this.logger = this.loggerStore.new("Main");
		this.requestLogger = this.loggerStore.new("Request");

		this.logger.custom(
			[
				`╔════════════════════════════════════════════════════╗`,
				`║                      SAHYG API                     ║`,
				`║                     By Alban G.                    ║`,
				`╠════════════════════════════════════════════════════╝`,
				`║   Version : ${this.config.package.version}`,
				`║   Environment : ${this.config.dev ? "development" : "production"}`,
				`╚`,
			].join("\n"),
			{
				name: "Infos",
				colors: ["cyan", "bold"],
			}
		);

		this.init();
	}
	async init() {
		this.db = new DB(this);
		await this.db.init();

		this.server = new Server(this);
		await this.server.init();

		await this.start();
	}
	async start() {
		await this.server.launch();
	}
	async stop() {} // TODO api start
	async restart() {} // TODO api restart
	async status() {
		return {
			api: "UP",
			db: await this.db.status()
		}
	} // TODO api stop
}

new APIServer();

module.exports = APIServer;
