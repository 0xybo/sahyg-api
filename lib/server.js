const recursive_readdir = require("recursive-readdir");
const { readFileSync } = require("fs");
const express = require("express");
const https = require("https");
const http = require("http");
const bodyParser = require("body-parser");
const multer = require("multer");
const hpp = require("hpp");
const helmet = require("helmet");
const cors = require("cors");
const expressSession = require("express-session");
const path = require("path");
const jwt = require("jsonwebtoken");

const APIRequest = require("./api_request");
const APIResponse = require("./api_response");

class Express {
	constructor(/** @type {import('../index.js')} */ APIServer) {
		this.APIServer = APIServer;

		this.logger = this.APIServer.loggerStore.new("Express");
		this.secret = APIServer.config.get("SECRET");
		this.sessionCookieName = APIServer.config.get("expressSession.name");
	}
	async expressInit() {
		this.express = express();
		this.upload = multer({ dest: this.APIServer.config.get("paths.upload") });

		this.express.set("trust proxy", true);
		this.express.disable("x-powered-by");
		this.express.use(cors(this.APIServer.config.get("cors")));
		this.express.use(helmet(this.APIServer.config.get("helmet")));
		this.express.use(
			expressSession({
				...this.APIServer.config.get("expressSession"),
				store: this.APIServer.db.sessionsMemoryStore,
			})
		);
		this.express.use(bodyParser.urlencoded(this.APIServer.config.get("bodyParser")));
		this.express.use(hpp());

		this.express.use(
			async (...args) => await new APIRequest(this.APIServer, ...args).asyncConstructor(),
			async (...args) => await new APIResponse(this.APIServer, ...args).asyncConstructor()
		);

		this.express.use((req, res, next) => (this.APIServer.config.dev ? console.log({ req, res }) : null, next()));

		await this.loadRoutes();
	}
	async loadRoutes() {
		this.routes = {};
		let routesPath = path.join(process.cwd(), this.APIServer.config.get("paths.routes"));
		(await recursive_readdir(routesPath, ["error.js"])).forEach((link) => {
			try {
				let name = link.match(/(?<=^|\\|\/)[^\\\/]+(?=.js$)/gm)?.[0];
				if (!name) return void this.logger.warn(`Unable to load route from ${link}`);
				let routeConfig = this.APIServer.config.get(["routes", name]);
				if (!routeConfig) return void this.logger.warn(`Failed to get route '${name}' config.`);
				if (!routeConfig.enabled) return void this.logger.warn(`Route '${name}' is disabled`);
				let route = new (require(link))(this.APIServer);
				this.routes[name] = {
					link,
					route,
					config: routeConfig,
				};
				this.logger.info(`Route '${name}' loaded successfully`);
			} catch (e) {
				this.logger.warn(`Unable to load route from ${link}`);
			}
		});
		let routeConfig = this.APIServer.config.get(["routes", "error"]);
		this.routes["error"] = {
			link: null,
			route: new (require(routesPath + "error.js"))(this.APIServer),
			config: routeConfig,
		};
		this.logger.info(`Route 'error' loaded successfully`);
	}
}

class Server extends Express {
	constructor(/** @type {import('../index.js')} */ APIServer) {
		super(APIServer);
		this.APIServer = APIServer;

		this.logger = this.APIServer.loggerStore.new("Server");
	}
	async init() {
		await this.expressInit();

		this.https = https.createServer(
			{
				key: readFileSync(this.APIServer.config.get("certificates.key")),
				cert: readFileSync(this.APIServer.config.get("certificates.cert")),
			},
			this.express
		);
		this.http = http.createServer((req, res) => {
			res.writeHead(302, {
				location: `https://${req.headers.host.match(/[a-z0-9\._-]+/)[0]}:${this.APIServer.config.get("ports.https") || 444}${req.url}`,
			});
			res.end();
		});

		return;
	}
	async launch() {
		this.https.listen(this.APIServer.config.get("ports.https") || 444, () => {
			this.logger.ok(`Server https listening on ${this.APIServer.config.get("ports.https") || 444}`);
		});
		this.http.listen(this.APIServer.config.get("ports.http") || 81, () => {
			this.logger.ok(`Server http listening on ${this.APIServer.config.get("ports.http") || 81}`);
		});

		return;
	}
	generateToken(username) {
		return jwt.sign({ data: username }, this.secret, { expiresIn: 2592000000 });
	}
}

module.exports = Server;
