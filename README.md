# KOII Tasks
 
### Introduction
KOII task a way to create tasks that solve some computational problem and earn KOII as your reward by submitting you data payloads. KOII tasks are created as an executable bundle that can be run on bundler nodes.

## Description
KOII tasks is a piece of code that is deployed on arweave blockchain and runs on the KOII nodes and perform some task like **Attention Game, Web scraping etc**. 

## Deployment

`yarn deploy [contract]`

Examples:

- `yarn deploy koi`
- `yarn deploy attention`

## Testing Contract

`yarn build`

- `node test/attention.test.js path/to/wallet.json`
- `node test/koi.test.js path/to/wallet.json`

## Testing Executable

`yarn build`

- `yarn execute taskName taskTxId`
- `yarn execute taskName taskTxId service` to test service mode

for example

`yarn execute attention SIIS17_lN78YARwpYfPLTLXEPRpR3BD-nkbCYrmaBss bundler`

If your executable does not make use of `namespace.taskTxId`, you can set `taskTxId` to `"test"` or any random value.
