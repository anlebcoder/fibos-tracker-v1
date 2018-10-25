const App = require('fib-app');
const http = require("http");
const mq = require("mq");
const FIBOS = require("fibos.js");
const conf = require("./conf/conf.json");
const BigNumber = require("bignumber.js");

function FIBOS_APP() {

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
				return new BigNumber(value).toFixed();
			} else {
				return value;
			}
		});

		message = JSON.parse(message);

		let ats = [];

		let block_info = {
			block_time: message.block_time,
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
					let blocks_has_id = db.models.blocks.save(block_info).id;

					let transactions_has_id = 0;

					messages = ats.map((at) => {
						at.blocks_has_id = blocks_has_id;
						at.transactions_has_id = transactions_has_id;
						let rs = db.models.transactions.createSync(at);

						transactions_has_id = rs.id;

						return rs;
					});
				});
			} catch (e) {
				console.error(e);
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

		let httpServer = new http.Server("", Config.httpServerPort, new mq.Chain([{
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

		}, 1 * 1000);
	};
}

FIBOS_APP.Config = conf;

module.exports = FIBOS_APP;