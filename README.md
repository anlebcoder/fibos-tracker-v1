# fibos-tracker

![数据模型](./diagram.svg)

fibos-tracker 是一个 FIBOS 区块链 数据 API 服务框架，基于 fib-app 框架实现(https://github.com/fibjs/fib-app).

- 提供对 fibos 区块数据的 emitter 监听事件
- 提供 http 服务，支持 GraphQL 调用
- 支持 快速定制自己的数据模型 app，自定义数据表以及自定义 hook 监听数据


使用之前您可能需要去了解一下这些内容：

- FIBOS (https://fibos.io)
- GraphQL (http://graphql.cn/)
- fib-app (https://github.com/fibjs/fib-app)


## Install

```
npm install fibos-tracker [--save] (稍后提交到 NPM)
```

## 框架说明

1. fibos-tracker 提供 emitter 监听，默认框架存储所有事务数据(transactions)
2. fibos-tracker 框架存储事务数据后，触发 hook 调用，通知其他 数据存储 app

## API 说明

- app.emitter API框架提供的插件
- app.startServer 启动 HTTP 服务
- app.use 加载新的数据模型 `app.use("数据模型名称",require("app代码目录"))`

## 使用说明

### 快速了解
```

// fibos-tracker 框架对象
const App = require("fibos-tracker");
const app = new App();

//启动 FIBOS 节点，相关内容请前往 https://fibos.io 官方
const fibos = require("fibos");
fibos.config_dir = "./data";
fibos.data_dir = "./data";
fibos.load("http", {
	"http-server-address": "0.0.0.0:8870",
	"access-control-allow-origin": "*",
	"http-validate-host": false,
	"verbose-http-errors": true
});

fibos.load("net", {
	"p2p-peer-address": ["p2p-testnet.fibos.fo:9870"],
	"p2p-listen-endpoint": "0.0.0.0:9870"
});

fibos.load("producer");
fibos.load("chain", {
	"contracts-console": true,
	"delete-all-blocks": true,
	"genesis-json": "genesis.json"
});

fibos.load("chain_api");

//使用 emitter 插件
fibos.load("emitter");
fibos.on('action', app.emitter);

//启动 app框架服务
app.startServer();

fibos.start();

```

### 配置 fibos-tracker Config

```
{
	"httpServerPort": 8080,
	"DBconnString": "sqlite:./fibos_chain.db",
	"websocketEnable": false,
	"nodeConfig": {
		"chainId": "68cee14f598d88d340b50940b6ddfba28c444b46cd5f33201ace82c78896793a",
		"httpEndpoint": "http://127.0.0.1:8870"
	}
}
```

| name                 | desc |	default|
|---------------------|--------|------------|
| httpServerPort     | http 服务端   | 8080   |
| DBconnString | 数据存储引擎    | 默认使用sqlite存储引擎    |
| websocketEnable | 是否开启websocket推送    | false    |


使用自定义配置：

```
const App = require("fibos-tracker");

console.log(App.Config); //打印 配置

App.Config.websocketEnable = true; //设置属性

App.Config.DBconnString = "mysql://root:123456@127.0.0.1/fibos_chain"; //设置数据存储引擎为 Mysql
```


### 快速定制自己的数据模型app

我们来使用框架设计一个只存储 eosio  账户合约的调用的模型。

#### 1. 新建一个目录 defs

``` sh
mkdir defs

```

#### 2. 新建文件 eosio_transactions.js

保存下面代码：

```
module.exports = {
	define: db => {
		//定义数据表
		return db.define('eosio_transactions', {
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
	},
	hook: (db, messages) => {
		//定义监控数据消息
		console.log("eosio_transactions");
	};
}
```

目前为止，我们可以监听到 emitter 插件推送的messages了，加载新的数据模型，运行代码试试：

```
app.use("eosio_transactions",require("./defs/eosio_transactions.js"));

```

