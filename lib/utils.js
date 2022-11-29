const path = require("path");

class Utils {
	root = process.cwd();

	relativeToRoot(absolutePath) {
		return path.relative(this.root, absolutePath);
	}
	parseCookies(text) {
		let cookies = {};
		text?.split(";").forEach((e) => {
			let [key, value] = e.trim().split("=");
			cookies[key] = value;
		});
		return cookies;
	}
}

module.exports = Utils;
