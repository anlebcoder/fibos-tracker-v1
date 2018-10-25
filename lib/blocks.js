"use strict";
module.exports = db => {

	/**
	 * @api DBConfig Table Define
	 * @apiVersion 1.0.0
	 * @apiGroup Blocks
	 * @apiDescription Blocks Table字段解释
	 *
	 * @apiParam {Date} block_time 区块时间
	 * @apiParam {Number} block_num 区块高度
	 * @apiParam {String} producer_block_id 区块id
	 * @apiParam {Number} count 包含交易数量
	 * @apiParam {String} producer 区块生产者
	 * @apiParam {String} previous 向前 区块信息
	 * @apiParam {String} transaction_mroot 交易 Merkle根节点
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
		count: {
			required: true,
			type: "integer",
			size: 4,
			defaultValue: 1
		},
		// producer: {
		// 	required: true,
		// 	type: "text",
		// 	size: 12
		// },
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
				'*': false
			};
		},
	});

	Blocks.updateStatus = function(bn) {
		let rs = db.driver.execQuerySync("UPDATE `blocks` set status = 'yes', updatedAt = ? where block_num <= ? and status = 'no';", [new Date(), bn]);
		return rs.affected;
	}

	Blocks.save = function(d) {
		let _block = Blocks.oneSync({
			block_num: d.block_num
		});

		if (_block) {
			_block.saveSync({
				count: _block.count + 1
			});
		} else {
			d.count = 1;
			d.status = "no";

			_block = Blocks.createSync(d);
		}

		return _block;
	}

	return Blocks;
};