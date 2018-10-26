const test = require('test');
test.setup();

const App = require("../../index.js");

describe("basic case", () => {

	it("config test", () => {

		let config = App.Config;
		assert.deepEqual(config, {
			"httpServerPort": 8080,
			"DBconnString": "sqlite:./fibos_chain.db",
			"websocketEnable": false,
			"nodeConfig": {
				"chainId": "68cee14f598d88d340b50940b6ddfba28c444b46cd5f33201ace82c78896793a",
				"httpEndpoint": "http://127.0.0.1:8870"
			}
		});

		App.Config.websocketEnable = true;

		config = App.Config;

		assert.deepEqual(config, {
			"httpServerPort": 8080,
			"DBconnString": "sqlite:./fibos_chain.db",
			"websocketEnable": true,
			"nodeConfig": {
				"chainId": "68cee14f598d88d340b50940b6ddfba28c444b46cd5f33201ace82c78896793a",
				"httpEndpoint": "http://127.0.0.1:8870"
			}
		});
	});
});