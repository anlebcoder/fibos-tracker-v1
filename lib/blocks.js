"use strict";

const util = require("util");
const blockCache = new util.LruCache(1000, 30 * 1000);

module.exports = db => {
	let Actions = db.models.actions;

	/**
	 * @api DBConfig Table Define
	 * @apiVersion 1.0.0
	 * @apiGroup Blocks
	 * @apiDescription Blocks Table字段解释
	 *
	 * @apiParam {Date} block_time 区块时间
	 * @apiParam {Number} block_num 区块高度
	 * @apiParam {String} producer_block_id 区块id
	 * @apiParam {String} producer 区块生产者
	 * @apiParam {String} previous 向前 区块信息 [未实现]
	 * @apiParam {String} transaction_mroot 交易 Merkle根节点 [未实现]
	 * @apiParam {String} status 是否可逆状态 yes no
	 * @apiParam {Date} createdAt
	 * @apiParam {Date} changedAt
	 */

	let Blocks = db.define('blocks', {
		block_time: {
			required: true,
			type: "date",
			time: true
		},
		block_num: {
			unique: true,
			required: true,
			type: "integer",
			size: 8
		},
		producer_block_id: {
			unique: true,
			required: true,
			type: "text",
			size: 64
		},
		producer: {
			required: true,
			type: "text",
			size: 12
		},
		// previous: {
		// 	required: true,
		// 	type: "text",
		// 	size: 64
		// },
		// transaction_mroot: {
		// 	required: true,
		// 	type: "text",
		// 	size: 64
		// },
		status: {
			required: true,
			type: "enum",
			values: ["yes", "no"],
			default: "no"
		}
	}, {
		hooks: {},
		methods: {},
		validations: {},
		functions: {},
		ACL: function(session) {
			return {
				'*': {
					"find": true,
					"read": true,
					"extends": {
						"actions": {
							"find": true,
							"read": true
						}
					}
				}
			};
		}
	});

	Blocks.updateStatus = function(bn) {
		let rs = db.driver.execQuerySync("UPDATE `blocks` set status = 'yes', updatedAt = ? where block_num <= ? and status = 'no';", [new Date(), bn]);
		return rs.affected;
	}

	Blocks.save = function(d) {
		return blockCache.get("blocks_" + d.block_num, function() {
			let _block = Blocks.oneSync({
				block_num: d.block_num
			});

			if (!_block) {
				d.status = "no";
				_block = Blocks.createSync(d);
			}

			return _block;
		});
	}

	Blocks.hasMany("actions", Actions, {}, {
		reverse: "blocks"
	});

	return Blocks;
};