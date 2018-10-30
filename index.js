const App = require('fib-app');
const util = require("util");
const path = require("path");
const fs = require("fs");
const FIBOS = require("fibos.js");
const conf = require("./conf/conf.json");

function bigIntoString(d) {
	for (let k in d) {
		let v = d[k],
			type = typeof v;

		if (type === "bigint") d[k] = v.toString();

		if (type === "object") bigIntoString(v);
	}
}

function Tracker() {
	//single instance
	if (Tracker.single) return Tracker.single;

	let Config = conf;
	let nodeConfig = Config.nodeConfig;
	let hooks = {};

	console.notice(`==========fibos-tracker==========\n\nDBconnString: ${Config.DBconnString}\n\nnodeConfig.chainId: ${nodeConfig.chainId}\n\nnodeConfig.httpEndpoint: ${nodeConfig.httpEndpoint}\n\n==========fibos-tracker==========`);

	let app = new App(Config.DBconnString);
	app.db.use(require('./defs'));

	let client = FIBOS({
		chainId: nodeConfig.chainId,
		httpEndpoint: nodeConfig.httpEndpoint,
		logger: {
			log: null,
			error: null
		}
	});

	setInterval(() => {
		try {
			let bn = client.getInfoSync().last_irreversible_block_num;

			let r = app.db(db => {
				return db.models.blocks.updateStatus(bn);
			});

			console.notice("update blocks irreversible block:", r);
		} catch (e) {
			console.error("Chain Node:%s can not Connect!", nodeConfig.httpEndpoint);
			console.error(e);
		}

	}, 5 * 1000);

	this.app = app;

	this.use = (filter, _app) => {
		if (!filter || !_app) throw new Error("use function(filter,_app)");

		if (hooks[filter]) console.warn("hook filter:%s will be replaced!", filter);

		let define = _app.define;

		app.db.use(util.isArray(define) ? define : [define]);

		hooks[filter] = _app.hook;
	};

	this.emitter = (errCallback) => {

		return (message) => {
			if (!message || !message.producer_block_id) return;

			if (message.act.name === "onblock") return;

			console.time("emitter-time");

			bigIntoString(message);

			app.db(db => {
				try {
					let messages = {};

					function collectMessage(_action) {
						function _c(k) {
							if (hooks[k]) {
								messages[k] = messages[k] || [];
								messages[k].push(_action);
							}
						}

						_c(_action.contract_name);

						_c(_action.contract_name + "/" + _action.action);
					}

					db.trans(() => {
						let blocksTable = db.models.blocks,
							actionsTable = db.models.actions,
							_block = blocksTable.save({
								block_time: message.block_time,
								producer: message.producer,
								block_num: message.block_num,
								producer_block_id: message.producer_block_id
							});

						function execActions(at, previousAction) {

							let _action = actionsTable.createSync({
								trx_id: at.trx_id,
								contract_name: at.act.account,
								action: at.act.name,
								authorization: at.act.authorization.map((a) => {
									return a.actor + "@" + a.permission
								}),
								data: at.act.data,
								rawData: !previousAction ? at : {}
							});

							collectMessage(_action);

							if (!previousAction)
								_block.addActions(_action);
							else
								previousAction.addInline_actions(_action);

							at.inline_traces.forEach((_at) => {
								execActions(_at, _action);
							});
						}

						execActions(message);
					});

					for (var k in messages)
						if (hooks[k]) hooks[k](db, messages[k]);

				} catch (e) {
					console.error(message, e, e.stack);

					if (util.isFunction(errCallback)) errCallback(message, e);
				}
			});

			console.timeEnd("emitter-time");
		};
	}

	this.diagram = () => {
		fs.writeTextFile(path.join(__dirname, 'diagram.svg'), app.diagram());
	}

	Tracker.single = this;
}

Tracker.Config = conf;

module.exports = Tracker;