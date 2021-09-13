# KOII Tasks

### Introduction

KOII task a way to create tasks that solve some computational problem and earn KOII as your reward by submitting you data payloads. KOII tasks are created as an executable bundle that can be run on bundler nodes.

## Description

KOII tasks is a piece of code that is deployed on arweave blockchain and runs on the KOII nodes and perform some task like **Attention Game, Web scraping etc**.

## How to create KOII tasks:

KOII tasks consists of two vital parts

1. A smart contract
2. `Executable.js`

#### Smart Contract

**_This smart contract is different from KOII main contract_**. This smart contract will have all the state data related to that particular KOII task. The smart contract consist of an

1. **_initial state_** which acts a starting point to your KOII tasks state.
2. **_index.js_** Provides all necessary handles for you smart contract

**_For more information on Arweave Smart contract visit [SmartWeave](https://github.com/ArweaveTeam/SmartWeave)_**

#### Actual KOII Task

The code for KOII task should be written inside `executable.js`.
This file has access to a `namespace` object via **_dependency injection_** which has several useful API including:

1. `koi-sdk`
2. `smartWeave`
3. `redis`
4. `filesystem(fs)`
5. `express`

Here are the detail of each component of namespace:

##### **_KOII-SDK_**

KOII-SDK is accessible via `tools` object, Please refer to [KOII_SDK](https://github.com/koii-network/tools) for documentation and usage details.

##### **_Smart Weave_**

SmartWeave is used to interact with smart contract on arweave and is accessible via `smartWeave` object .
**_For more information on Arweave Smart contract visit [SmartWeave](https://github.com/ArweaveTeam/SmartWeave)_**

#### redis

KOII task namespace also has a redis wrapper to interact with redis. Redis must be installed in order to use this wrapper. Each Task has its own `namespaceId` prepended to all the keys in redis.

This API exposes two methods in order to communicate with Redis.

1. `redisGet(key,value)`
2. `redisSet(key)`

For example if you call `redisSet("Hello","world)` you can get it by calling `redisGet("Hello")` but behind the scenes it is actually adding namespace prefix with the key like so

> `hello` will be stored as `09ea3bcd43hello`
> This is done to isolate the KOII tasks data from others.

#### filesystem(fs)

The KOII task namespace also have a fs module exposed in it.
this module can be called as

```js
await namespace.fs("readFile", filename, options);
```

The first parameter to `namespace.fs` is the function name from [fs.promise module](https://nodejs.org/api/fs.html) followed by the parameters that the function expects and returns a promise.

#### Express:

In some types of KOII task you want to expose some endpoint in order to receive data from outside world, like for example in case of attention game we need to receive the PoRT(proof of real Traffic) from the end user, so to serve this purpose express API comes to the play.

So in order to serve an endpoint via express app.

```js
namespace.express(method, path, callback);
```

in setup function

This file consist of two important methods `setup()` and `execute()` which are called by the node while running the KOII task.

1. The `setup()` method should be used to register endpoints on express app `
2. The `execute()` method is the main function which is also called by the node executing the Task

## Deployment

#### Contracts

`yarn deploy [contract]`

Examples:

- `yarn deploy koi`
- `yarn deploy attention`

#### Executable File

`yarn deploy_executable`

## Testing Contract

`yarn build`

- `node test/attention.test.js path/to/wallet.json`
- `node test/koi.test.js path/to/wallet.json`

## Testing Executable

`yarn build`

- `yarn execute attention [task_contract] `
- `yarn execute attention [task_contract] service` to test bundler mode
