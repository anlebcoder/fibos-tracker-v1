const App = require('fib-app');
const http = require("http");
const path = require("path");
const fs = require("fs");
const mq = require("mq");
const FIBOS = require("fibos.js");
const conf = require("./conf/conf.json");

function Tracker() {

	let Config = conf;
	let hooks = {};
	let app = new App(Config.DBconnString);

	//load system app
	app.db.use(require('./lib'));

	this.use = (router, _app) => {
		app.db.use([_app.define]);
		hooks[router] = _app.hook;
	};

	this.emitter = (message) => {
		if (!message || !message.producer_block_id) return;

		if (message.act.name === "onblock") return;

		console.time("emitter-running");
		message = JSON.stringify(message, function(key, value) {
			if (typeof value === 'bigint') {
				return value.toString();
			} else {
				return value;
			}
		});

		message = JSON.parse(message);

		let ats = [];

		let block_info = {
			block_time: message.block_time,
			producer: message.producer,
			block_num: message.block_num,
			producer_block_id: message.producer_block_id
		}

		function getActions(at) {
			let inline_traces = at.inline_traces;

			ats.push({
				trx_id: at.trx_id,
				contract_name: at.act.account,
				action: at.act.name,
				authorization: at.act.authorization.map(function(a) {
					return a.actor + "@" + a.permission
				}),
				status: "no",
				data: at.act.data,
				rawData: ats.length === 0 ? at : {}
			});

			inline_traces.forEach(getActions);
		}

		getActions(message);

		let messages = [];

		app.db(db => {
			try {
				db.trans(() => {
					let blocksTable = db.models.blocks;
					let actionsTable = db.models.actions;

					let _block = blocksTable.save(block_info);

					let previousAction = null;

					messages = ats.map((at, index) => {
						let _action = actionsTable.createSync(at);

						_block.addActions(_action);

						if (previousAction) {
							previousAction.addInlineactions(_action);
						}

						previousAction = _action;

						return _action;
					});
				});
			} catch (e) {
				console.error(e, e.stack);
				console.error(message);
				process.exit();
			}
		});

		app.db(db => {
			for (var h in hooks) hooks[h](db, messages);
		});
		console.timeEnd("emitter-running");
	};

	this.startServer = () => {
		console.notice("httpServer listen on 0.0.0.0:%s", Config.httpServerPort);

		fs.writeTextFile(path.join(__dirname, 'diagram.svg'), app.diagram());

		let httpServer = new http.Server("", Config.httpServerPort, new mq.Chain([(req) => {
				req.session = {};
			}, {
				'^/ping': function(req) {
					req.response.write("pong");
				},
				'/1.0/app': app,
				"*": [
					function(req) {}
				]
			},
			function(req) {}
		]));
		httpServer.crossDomain = true;
		httpServer.asyncRun();

		let nodeConfig = Config.nodeConfig;

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
					return db.models.blocks.updateStatus(bn);
				});

				console.notice("update blocks irreversible block:", r);
			} catch (e) {
				console.error(e.stack);
			}

		}, 60 * 1000);
	};
}

Tracker.Config = conf;

module.exports = Tracker;