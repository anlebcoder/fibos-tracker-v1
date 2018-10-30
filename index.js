const App = require('fib-app');
const coroutine = require("coroutine");
const util = require("util");
const path = require("path");
const fs = require("fs");
const FIBOS = require("fibos.js");
const Config = require("./conf/conf.json");

function bigIntoString(d) {
	for (let k in d) {
		let v = d[k],
			type = typeof v;

		if (type === "bigint") d[k] = v.toString();

		if (type === "object") bigIntoString(v);
	}
}

function Tracker() {
	let hooks = {},
		app = new App(Config.DBconnString);

	app.db.use(require('./defs'));

	let sys_last_irreversible_block_num = app.db(db => {
		return db.models.blocks.get_sys_last();
	});

	let httpEndpoint = "http://127.0.0.1:" + Config.emitterNodePort;

	let client = FIBOS({
		httpEndpoint: httpEndpoint,
		logger: {
			log: null,
			error: null
		}
	});

	console.notice(`==========fibos-tracker==========\n\nDBconnString: ${Config.DBconnString}\n\nemitterNode: ${httpEndpoint}\n\nsys_last_irreversible_block_num: ${sys_last_irreversible_block_num}\n\n==========fibos-tracker==========`);

	coroutine.sleep(2000);

	setInterval(() => {
		try {
			let bn = client.getInfoSync().last_irreversible_block_num;

			let r = app.db(db => {
				return db.models.blocks.updateStatus(bn);
			});

			console.notice("update blocks irreversible block:", r);
		} catch (e) {
			console.error("Chain Node:%s can not Connect!", httpEndpoint);
			console.error(e);
		}
	}, 5 * 1000);

	this.app = app;

	this.use = (filter, model) => {
		if (!filter || !model) throw new Error("use function(filter,model)");

		if (hooks[filter]) console.warn("hook filter:%s will be replaced!", filter);

		let define = model.define;

		app.db.use(util.isArray(define) ? define : [define]);

		hooks[filter] = model.hook;
	};

	this.emitter = (errCallback) => {

		return (message) => {
			if (!message || !message.producer_block_id) return;

			if (message.act.name === "onblock" && !Config.onblockEnable) return;

			console.time("emitter-time");

			bigIntoString(message);

			if (sys_last_irreversible_block_num > message.block_num) {
				console.error("sys block_num(%s) > node block_num(%s)", sys_last_irreversible_block_num, message.block_num);
				if (util.isFunction(errCallback)) errCallback(message, {});
				return;
			}

			app.db(db => {
				try {
					let messages = {},
						sys_blocksTable = db.models.blocks,
						sys_actionsTable = db.models.actions;

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
						let _block = sys_blocksTable.save({
							block_time: message.block_time,
							producer: message.producer,
							block_num: message.block_num,
							producer_block_id: message.producer_block_id
						});

						function execActions(at, previousAction) {

							let _action = sys_actionsTable.createSync({
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
}

Tracker.Config = Config;

module.exports = Tracker;