const App = require('fib-app');
const http = require("http");
const mq = require("mq");
const FIBOS = require("fibos.js");
const conf = require("./conf/conf.json");

module.exports = function() {

	let app = new App(conf.DBconnString);
	app.db.use(require('./lib'));

	let hooks = {};

	this.Config = conf;

	this.use = (router, _app) => {
		app.db.use([_app.define]);
		hooks[router] = _app.hook;
	};

	this.emitter = (message) => {
		if (!message || !message.producer_block_id) return;

		if (message.act.name === "onblock") return;

		console.time("emitter-running");
		let messages = app.db(db => {
			return db.models.transactions.create(message);
		});

		app.db(db => {
			for (var h in hooks) hooks[h](db, messages);
		});
		console.timeEnd("emitter-running");
	};

	this.startServer = () => {
		console.notice("httpServer listen on 0.0.0.0:%s", this.Config.httpServerPort);

		let httpServer = new http.Server("", this.Config.httpServerPort, new mq.Chain([{
				'^/ping': function(req) {
					req.response.write("pong");
				},
				'/v1/app': app,
				"*": [
					function(req) {}
				]
			},
			function(req) {}
		]));
		httpServer.crossDomain = true;
		httpServer.asyncRun();

		let nodeConfig = this.Config.nodeConfig;

		let fibos = FIBOS({
			chainId: nodeConfig.chainId,
			httpEndpoint: nodeConfig.httpEndpoint,
			logger: {
				log: null,
				error: null
			}
		});

		setInterval(() => {
			try {
				let bn = fibos.getInfoSync().last_irreversible_block_num;

				let r = app.db(db => {
					return db.models.transactions.updateStatus(bn);
				});

				console.notice("update transactions irreversible block:", r);
			} catch (e) {
				console.error(e.stack);
			}

		}, 1 * 1000);
	};
}