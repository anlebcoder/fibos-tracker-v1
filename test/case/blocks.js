const test = require('test');
test.setup();

describe("blocks case", () => {

	let id = 0;

	it("find blocks list", () => {
		let r = graphql(`
			{
				find_blocks(
					skip: 0,
					limit: 10,
					order: "-id"
				){
					id,
					block_time,
					block_num,
					producer_block_id,
					producer,
					status,
					createdAt,
					updatedAt
				}
            }`).json();

		assert.ok(r.data.find_blocks.length > 0);
	});

	it("get blocks list", () => {
		let id = 1;

		let r = graphql(`
			{
				blocks(id:"${id}"){
					id,
					block_time,
					block_num,
					producer_block_id,
					producer,
					status,
					createdAt,
					updatedAt
				}
}		`).json();

		assert.equal(r.data.blocks.id, 1);
	});

	it("get extends actions", () => {
		let id = 1;

		let r = graphql(`
		{
			blocks(id: "${id}") {
				id,
				block_time,
				block_num,
				producer_block_id,
				producer,
				status,
				createdAt,
				updatedAt,
				actions {
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

		assert.equal(r.data.blocks.actions[0].id, 1);
	});
});