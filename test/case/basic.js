const test = require('test');
test.setup();

const App = require("../../index.js");

describe("basic case", () => {

	it("config test", () => {

		let config = App.Config;

		["httpServerPort", "DBconnString", "websocketEnable", "nodeConfig"].forEach((k) => {
			assert.notEqual(config[k], undefined);
		});

		App.Config.websocketEnable = true;

		config = App.Config;

		assert.equal(config.websocketEnable, true);

		["httpServerPort", "DBconnString", "websocketEnable", "nodeConfig"].forEach((k) => {
			assert.ok(config[k])
		});
	});
});