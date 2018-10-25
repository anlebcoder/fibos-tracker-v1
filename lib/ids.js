"use strict";
module.exports = db => {

	/**
	 * @api DBConfig Table Define
	 * @apiVersion 1.0.0
	 * @apiGroup Ids
	 * @apiDescription Ids Table字段解释
	 *
	 * @apiParam {String} k kv 计数器的key
	 * @apiParam {Number} v kv 计数器的value
	 * @apiParam {Date} createdAt
	 * @apiParam {Date} changedAt
	 */
	let Ids = db.define('ids', {
		k: {
			type: "text",
			size: 32,
			required: true,
			unique: true
		},
		v: {
			type: "integer",
			size: 8,
			defaultValue: 0
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

	Ids.get = function(k) {
		return Ids.oneSync({
			k: k
		});
	}

	Ids.update = function(k, v) {
		let rs = Ids.get(k);

		if (!rs || !rs.k)
			rs = db.driver.execQuerySync("INSERT INTO ids (k,v,createdAt,updatedAt) values(?,?,Now(),Now());", k, v);
		else
			rs = db.driver.execQuerySync("update ids set v = ?, updatedAt =Now() where k = ? and v = ?", [v, k, rs[0].v]);

		return rs.affected === 1;
	}

	return Ids;
};