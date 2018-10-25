"use strict";

module.exports = db => {
	let Blocks = db.models.blocks;
	/**
	 * @api DBConfig Table Define
	 * @apiVersion 1.0.0
	 * @apiGroup Transactions
	 * @apiDescription Transactions Table字段解释
	 *
	 * @apiParam {Number} blocks_has_id blocks关联ID
	 * @apiParam {Number} transactions_has_id transactions关联ID
	 * @apiParam {String} trx_id 交易id
	 * @apiParam {String} contract_name 合约名称
	 * @apiParam {String} action action 名称
	 * @apiParam {JSON} authorization 授权用户
	 * @apiParam {JSON} data 交易data
	 * @apiParam {JSON} rawData 原始数据
	 * @apiParam {Date} createdAt
	 * @apiParam {Date} changedAt
	 */

	let Transactions = db.define('transactions', {
		trx_id: {
			required: true,
			type: "text",
			size: 64
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
		authorization: {
			required: true,
			type: "object"
		},
		data: {
			required: true,
			type: "object",
			big: true
		},
		rawData: {
			required: true,
			type: "object",
			big: true
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

	Transactions.hasOne("blocks_has", Blocks, {});

	Transactions.hasOne("transactions_has", Transactions, {});

	return Transactions;
}