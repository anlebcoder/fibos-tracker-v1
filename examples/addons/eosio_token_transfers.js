let define = db => {
	return db.define('eosio_token_transfers', {
		from: {
			required: true,
			type: "text",
			size: 12
		},
		to: {
			required: true,
			type: "text",
			size: 12
		},
		quantity: {
			required: true,
			type: "text",
			size: 256
		},
		memo: {
			type: "text",
			size: 256
		}
	}, {
		hooks: {},
		methods: {},
		validations: {},
		functions: {},
		ACL: function(session) {
			return {
				'*': {
					find: true,
					read: true
				}
			};
		}
	});
}

let hook = (db, messages) => {
	let eosio_token_transfers = db.models.eosio_token_transfers;
	try {
		db.trans((db) => {
			messages.forEach((m) => {
				eosio_token_transfers.createSync(m.data);
			});
		});
	} catch (e) {
		console.error(e);
	}
}

module.exports = {
	define: define,
	hook: hook
}