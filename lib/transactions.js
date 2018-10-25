"use strict";

const BigNumber = require("bignumber.js");

module.exports = db => {

	/**
	 * @api DBConfig Table Define
	 * @apiVersion 1.0.0
	 * @apiGroup Transactions
	 * @apiDescription Transactions Table字段解释
	 *
	 * @apiParam {Date} block_time 区块时间
	 * @apiParam {Number} block_num 区块高度
	 * @apiParam {String} producer_block_id 区块高度
	 * @apiParam {String} trx_id 交易id
	 * @apiParam {Number} sequence action内inline顺序序号
	 * @apiParam {String} contract_name 合约名称
	 * @apiParam {String} action action 名称
	 * @apiParam {String} status 是否可逆状态 yes no
	 * @apiParam {JSON} data 交易data
	 * @apiParam {JSON} jsonData 原始数据
	 * @apiParam {Date} createdAt
	 * @apiParam {Date} changedAt
	 */

	let Transactions = db.define('transactions', {
		block_time: {
			required: true,
			type: "date",
			time: true
		},
		block_num: {
			required: true,
			type: "integer",
			size: 8
		},
		producer_block_id: {
			required: true,
			type: "text",
			size: 64
		},
		trx_id: {
			required: true,
			type: "text",
			size: 64
		},
		sequence: {
			required: true,
			type: "integer",
			size: 8,
			defaultValue: 0
		},
		contract_name: {
			required: true,
			type: "text",
			size: 12
		},
		action: {
			required: true,
			type: "text",
			size: 12
		},
		authorizationer: {
			required: true,
			type: "object"
		},
		status: {
			required: true,
			type: "enum",
			values: ["yes", "no"],
			default: "no"
		},
		data: {
			required: true,
			type: "object"
		},
		jsonData: {
			required: true,
			type: "object"
		}
	}, {
		hooks: {},
		methods: {},
		validations: {},
		functions: {},
		ACL: function(session) {
			return {
				"*": {
					"find": true,
					"read": true
				}
			}
		}
	});

	Transactions.create = function(message) {
		message = JSON.stringify(message, function(key, value) {
			if (typeof value === 'bigint') {
				return new BigNumber(value).toFixed();
			} else {
				return value;
			}
		});

		message = JSON.parse(message);

		let sequence = 0;

		let ats = [];

		function getActions(at) {
			let inline_traces = at.inline_traces;

			ats.push({
				block_time: at.block_time,
				block_num: at.block_num,
				producer_block_id: at.producer_block_id,
				trx_id: at.trx_id,
				contract_name: at.act.account,
				action: at.act.name,
				authorizationer: at.act.authorization.map(function(a) {
					return a.actor + "@" + a.permission
				}),
				status: "no",
				data: at.act.data,
				sequence: sequence,
				jsonData: sequence === 0 ? at : {}
			});

			sequence++;

			inline_traces.forEach(getActions);
		}

		getActions(message);

		let result = [];

		try {
			db.trans(() => {
				result = ats.map(Transactions.createSync);
			});
		} catch (e) {
			console.error(e);
			console.error(message);
			process.exit();
		}

		return result;
	};

	return Transactions;
}