const test = require('test');
test.setup();

describe("actions case", () => {
	let id = 0;

	it("find actions list", () => {
		let r = graphql(`
			{
                find_actions(
                    skip: 0,
                    limit: 10,
                    order: "-id"
                ){
                    id,
					trx_id,
					contract_name,
					action,
					authorization,
					data,
					createdAt,
					updatedAt
                }
            }`).json();

		assert.equal(r.data.find_actions.length, 1);
		assert.ok(r.data.find_actions[0].trx_id);
	});

	it("get actions list", () => {
		let id = 1;

		let r = graphql(`
			{
                actions(id:"${id}"){
                    id,
					trx_id,
					contract_name,
					action,
					authorization,
					data,
					createdAt,
					updatedAt
                }
            }`).json();

		assert.equal(r.data.actions.id, 1);
		assert.ok(r.data.actions.trx_id);
	});

	it("get extends actions", () => {
		let id = 1;

		let r = graphql(`
			{
                actions(id:"${id}"){
                   	id,
					trx_id,
					contract_name,
					action,
					authorization,
					data,
					createdAt,
					updatedAt
					blocks{
						id,
	                    block_time,
	                    block_num,
						producer_block_id,
						producer,
						status,
						createdAt,
						updatedAt
					},
					inlineactions{
						id,
						trx_id,
						contract_name,
						action,
						authorization,
						data,
						createdAt,
						updatedAt
					}
                }
            }`).json();

		assert.equal(r.data.actions.inlineactions.length, 0);
		assert.equal(r.data.actions.blocks.length, 1);
	});
});