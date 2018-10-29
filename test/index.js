const http = require("http");
const fs = require("fs");
const test = require('test');
const path = require("path");
const conf = require("../conf/conf.json");
const App = require("../index.js");

global.graphql = function(body) {
	return http.post(`http://127.0.0.1:${conf.httpServerPort}/1.0/app/`, {
		headers: {
			'Content-Type': 'application/graphql'
		},
		body: body
	});
}

App.Config.DBconnString = "mysql://root:123456@127.0.0.1/fibos_chain";

new App().startServer();

run("./case/actions");

// fs.readdir(path.join(__dirname, "./case"))
// 	.filter(f => f.slice(-3) == ".js")
// 	.forEach(f => run(`./case/${f}`));

test.run(console.INFO);

process.exit();