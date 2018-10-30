# fibos-tracker

fibos-tracker 是一个 FIBOS 区块链数据 API 服务框架，基于 fib-app 框架实现(https://github.com/fibjs/fib-app).

- 提供对 FIBOS 区块数据的 emitter 监听事件
- 提供 http 服务，支持 GraphQL 调用
- 支持使用 ORM模型 定制自己的数据模型 model，自定义数据表以及自定义 hook 监听数据

使用之前您可能需要去了解一下这些内容：

- [FIBOS](https://fibos.io)
- [GraphQL](http://graphql.cn/)
- [fib-app](https://github.com/fibjs/fib-app)

## 目录

<dl>
<dt><a href="#fibos-版本支持">FIBOS 版本支持</a></dt>
<dd></dd>
<dl>
<dt><a href="#数据存储支持">数据存储支持</a></dt>
<dd></dd>
<dl>
<dt><a href="#安装-fibos-tracker">安装 fibos-tracker</a></dt>
<dd></dd>
<dl>
<dt><a href="#框架说明及-API-使用">框架说明及 API 使用</a></dt>
<dd></dd>
<dt><a href="#example-快速应用">Example-快速应用</a></dt>
<dd></dd>
<dt><a href="#高级篇-使用-orm-自定义数据">高级篇-使用 ORM 自定义数据</a></dt>
<dd></dd>
</dl>

## FIBOS 版本支持

支持: `v1.3.1.4+`

快速安装: `curl -s https://fibos.io/download/installer.sh | sh`

## 数据存储支持

- Mysql
- SQLite

## 安装 fibos-tracker

```
fibos --install fibos-tracker
```

## 框架说明及 API 使用

### fibos-tracker DB 说明

框架默认存储了 blocks 以及 actions 的基础数据，如下图显示：

![数据模型](./diagram.svg)

#### blocks 表数据

| 字段                 | 类型 |	备注|
|---------------------|--------|------------|
| id     | Number   | 自增长id   |
| block_time | Date    |   区块时间  |
| block_num | BigInt    |   区块高度  |
| producer_block_id | String    |  区块hash   |
| producer | String    |   区块producer  |
| status | String    |  可逆状态   |
| createdAt | Date    |   记录创建时间  |
| updatedAt | Date    |   记录更新时间  |

#### actions 表数据

| 字段                 | 类型 |	备注|
|---------------------|--------|------------|
| id     | Number   | 自增长id   |
| trx_id | String    |   交易id  |
| contract_name | String    |   合约名称  |
| action | String    |  action 名称   |
| authorization | Array    |   授权用户  |
| data | JSON    |  交易data   |
| rawData | JSON    |  原始数据   |
| createdAt | Date    |   记录创建时间  |
| updatedAt | Date    |   记录更新时间  |

### fibos-tracker API 介绍

####  Tracker.Config

Config 是 Tracker 全局属性，可以使用该属性快速修改配置，如：修改存储引擎配置。

示例： 

```
const Tracker = require("fibos-tracker");
Tracker.Config.DBconnString = "mysql://root:123456@127.0.0.1/fibos_chain";
Tracker.Config.emitterNodePort = 8888;
Tracker.Config.onblockEnable = true;
```

| name                 | desc |	default|
|---------------------|--------|------------|
| DBconnString | 数据存储引擎    | 默认使用SQLite存储引擎    |
| emitterNodePort | emitter rpc port 端口   | 默认 8870  |
| onblockEnable | 是否记录空块    | false |


#### tracker.app

fib-app 的实例 app 对象，具体参看 [fib-app](https://github.com/fibjs/fib-app)

tracker.app 对象可支持路由访问。

示例：

```
const http = require("http");
const Tracker = require("fibos-tracker");
const tracker = new Tracker();

let httpServer = new http.Server("", 8080, {
	'/1.0/app': tracker.app
});

httpServer.run();

```

#### tracker.emitter

FIBOS emitter 插件，配合 FIBOS 的 action 插件使用。

示例：

```
const fibos = require("fibos");
const Tracker = require("fibos-tracker");
const tracker = new Tracker();

fibos.load("emitter");

let errCallback = (message, e) => {
	console.error("erroCallback")
};

fibos.on('action', tracker.emitter(errCallback));

```

tracker.emitter 参数 `errCallback` function. `errCallback` params:

| params                 |type | desc |
|---------------------|--------|--------|
| message     | JSON |action 原始数据   |
| e |  Object | emitter 执行过程的 Error 对象    |


#### tracker.diagram

生成数据表的关联图，如果自定义了数据表，需要先调用 tracker.use 再执行。

示例：

```
const Tracker = require("fibos-tracker");
const tracker = new Tracker();

//If exist other db modles，please exec tracker.use.

tracker.diagram();
```

#### tracker.use

自定义 hook 监听数据，使用 ORM 模型自定义 DB 存储以及处理。

示例：

```
const fibos = require("fibos");
const Tracker = require("fibos-tracker");
const tracker = new Tracker();

tracker.use("eosio/newaccount", {
	define: (db) => {
		// ORM DB Define
	},
	hook: (db, messages) => {
		// hook Tracker messages
	}
});
```
define 支持数组形式，用于某个 model 需要多个数据表的场景。

示例：

```
tracker.use("eosio/newaccount", {
	define: [(db) => {
		// ORM DB Define A
	}, (db) => {
		// ORM DB Define B
	}],
	hook: (db, messages) => {
		// hook Tracker messages
	}
});
```

tracker.use 参数定义：

| params             | type   | desc |
|---------------------|--------|--------|
| filter     |String |自定义过滤规则,如： 'eosio.token','eosio.token/transfer'  |
| model | Object | 自定义数据对象，包含 define function 定义 和 hook function 监听定义  |


`filter` 参数说明：

- 过滤某个合约：'eosio.token'
- 过滤某个合约的 action：'eosio.token/transfer' 

`model` 参数定义：

| key             | type   | desc | params| 
|---------------------|--------|--------|--------|
| define     | Function |使用 ORM 模型定义数据表，提供 API 访问   |参数 `db` ORM db对象，可用于操作数据层 | 
| hook | Function | 监听 action 数据的 hook 方法     | 参数 db 同 define db对象，参数 messages 是 action 数据集合 |


## Example 快速应用

[Example 源码](./examples)

学习了解 fibos-trakcer 之后，让我们开始动手编写，使用框架写一个区块链数据存储展现的应用。

与 FIBOS 的 emiiter结合，写一个应用。 它可以同步 FIBOS TestNet 网络区块数据，并且使用 GraphQL 获取应用数据。

FIBOS TestNet： 

- WebSite: https://testnet.fibos.fo/#/
- ChainId: 68cee14f598d88d340b50940b6ddfba28c444b46cd5f33201ace82c78896793a
- P2P: p2p-testnet.fibos.fo:9870


### 环境准备

1. 下载 FIBOS

```
curl -s https://fibos.io/download/installer.sh | sh
```

2. 查看 FIBOS 版本

```
$ fibos //Enter
```

输出:(不同 FIBOS 版本输出信息不一致)

```
Welcome to FIBOS v1.3.1.3-3-g5f567ac. Based on fibjs 0.27.0-dev.
Type ".help" for more information.
```

3. 准备示例目录

```
 :$ mkdir example;cd example
 :$ fibos --init
 :$ fibos --install fibos-tracker
```

### 编写例子

保存下面配置数据到 genesis.json:

```
{
    "initial_timestamp": "2018-08-01T00:00:00.000",
    "initial_key": "FO6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV",
    "initial_configuration": {
        "max_block_net_usage": 1048576,
        "target_block_net_usage_pct": 1000,
        "max_transaction_net_usage": 524288,
        "base_per_transaction_net_usage": 12,
        "net_usage_leeway": 500,
        "context_free_discount_net_usage_num": 20,
        "context_free_discount_net_usage_den": 100,
        "max_block_cpu_usage": 200000,
        "target_block_cpu_usage_pct": 1000,
        "max_transaction_cpu_usage": 150000,
        "min_transaction_cpu_usage": 100,
        "max_transaction_lifetime": 3600,
        "deferred_trx_expiration_window": 600,
        "max_transaction_delay": 3888000,
        "max_inline_action_size": 4096,
        "max_inline_action_depth": 4,
        "max_authority_depth": 6
    },
    "initial_chain_id": "68cee14f598d88d340b50940b6ddfba28c444b46cd5f33201ace82c78896793a"
}
```

保存下面代码到 index.js:

```
onst http = require("http");
const fibos = require("fibos");
const Tracker = require("fibos-tracker");
const tracker = new Tracker();

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

fibos.load("emitter");
fibos.on('action', tracker.emitter(() => {
	console.log("emitter error callback!");
}));

fibos.start();

let httpServer = new http.Server("", 8080, [
	(req) => {
		req.session = {};
	}, {
		'^/ping': (req) => {
			req.response.write("pong");
		},
		'/1.0/app': tracker.app,
		"*": [function(req) {}]
	},
	function(req) {}
]);

httpServer.crossDomain = true;
httpServer.asyncRun();
```

### 启动服务

```
fibos index.js
```

输出下列信息，说明启动成功，正在同步写入数据：
```
putLog emitter-running: 1.54080331e+12ms
```

### 使用 GraphQL 方式获取应用数据

1. FIBOS GraphQL 客户端

```
const http = require("http");

let graphql = function(body) {
	return http.post(`http://127.0.0.1:8080/1.0/app/`, {
		headers: {
			'Content-Type': 'application/graphql'
		},
		body: body
	});
}
```

2. Web GraphQL 客户端

Jquery Ajax 示例:

```
let graphql = function(body) {
    $.ajax({
        type: "POST",
        url: "http://127.0.0.1:8080/1.0/app",
        data: body,
        headers: {
            "Content-Type": "application/graphql"
        },
        success: (res) => {
            console.log("success");
        },
        error: (res) => {
            console.log("error");
        }
    });
}
```

#### GraphQL 获取应用-列表数据

```
graphql(`
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
}`)
```

#### GraphQL 获取应用-详情数据

```
graphql(`
{
    blocks(id:"1"){
        id,
        block_time,
        block_num,
		producer_block_id,
		producer,
		status,
		createdAt,
		updatedAt,
		actions{
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
}`)
```

## 高级篇-使用 ORM 自定义数据

[Example 源码](./examples)

学习了基础篇的应用，让我们使用 fibos-tracker 的 `use` 完成一个仅监控 eosio.token 合约 transfer 的应用。

### 环境准备

基于上面的环境应用，让我们创建一个目录:

```
:$ mkdir addons;cd addons;
```

### 设计&&定义一个数据模型

设计数据表 eosio_token_transfers：

| 字段                 | 类型 |	备注|
|---------------------|--------|------------|
| id     | Number   | 自增长 id   |
| from | String    |   转出方  |
| to | String    |   转入方  |
| quantity | String    |  交易数量   |
| memo | String    |   memo  |
| createdAt | Date    |   记录创建时间  |
| updatedAt | Date    |   记录更新时间  |


使用 ORM Define 数据表逻辑:

```
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
				'*': false
			};
		}
	});
}
```

### 定义 hook 数据监听

hook 监听的 messages 是一组系统 actions 表的 对象，请参考上面的 actions 表的数据表解释。

tracker.use 需要对 hook 的接受数据进行过滤。

```
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
```

### 保存自定义数据模型代码

保存下面代码到 eosio_token_transfers.js：

```
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
```

### 使用 fibos-tracker 加载新的数据模型

```
tracker.use("eosio.token/transfer",require("./addons/eosio_token_transfers.js"));
```

#### 启动服务&&使用 GraphQL 获取数据

启动服务：
```
fibos index.js
```

查询 eosio_token_transfers 列表：

```
graphql(`
{
    find_eosio_token_transfers(
        skip: 0,
        limit: 10,
        order: "-id"
    ){
        id,
        from,
        to,
        quantity,
        memo,
        createdAt,
        updatedAt
    }
}`)
```