const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");

const User = require("./db/user");
const Group = require("./db/group");
const Session = require("./db/session");

class DB {
	constructor(/** @type {import('../index')} */ APIServer) {
		this.APIServer = APIServer;

		this.logger = APIServer.loggerStore.new("DB");
		this.models = {};
		this.databases = {};

		this.User = User.bind(this);
		this.Group = Group.bind(this);
		this.Session = Session.bind(this);
	}
	async init() {
		for (const db of this.APIServer.config.get("db.databases")) {
			this.databases[db.name] = await mongoose
				.createConnection(`${this.APIServer.config.get("db.mongo.uri")}/${db.name}?${this.APIServer.config.get("db.mongo.params")}`)
				.asPromise()
				.then((mongoose) => {
					this.logger.ok(`DB ${db.name} successfully connected`);
					return mongoose;
				})
				.catch((e) => {
					this.logger.error(e);
					process.exit();
				});

			for (const model of this.APIServer.config.get("db.models").filter((model) => db.models.includes(model.name))) {
				this.models[model.name] = await this.databases[db.name].model(model.name, model.schema);
			}
		}

		this.sessionsMemoryStore = MongoStore.create({
			mongoUrl: `${this.APIServer.config.get("db.mongo.uri")}/sessions?${this.APIServer.config.get("db.mongo.params")}`,
			collectionName: this.APIServer.config.get("sessions.collectionName"),
		});
	}
	async status() {
		return Object.fromEntries(
			Object.entries(this.databases).map(([name, database]) => {
				let status;
				switch (database.readyState) {
					case 0:
						status = "DISCONNECTED";
						break;
					case 1:
						status = "CONNECTED";
						break;
					case 2:
						status = "CONNECTING";
						break;
					case 3:
						status = "DISCONNECTING";
						break;o
				}
				return [name, status];
			})
		);
	}
}

module.exports = DB;
