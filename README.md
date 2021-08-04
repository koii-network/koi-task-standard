# Contracts

## Deployment

`yarn deploy [contract]`

Examples:

- `yarn deploy koi`
- `yarn deploy attention`

## Testing Contract

`yarn build`

- `node test/attentionM.test.js path/to/wallet.json`
- `node test/koi.test.js path/to/wallet.json`

## Testing Executable

`yarn build`

- `yarn execute taskName taskTxId`
- `yarn execute taskName taskTxId bundler` to test bundler mode

for example

`yarn execute attentionM IpEKWpnCCa09-fALeXsQmVD_UYHCuyblVpgPOrsMXEM bundler`

If your executable does not make use of `namespace.taskTxId`, you can set `taskTxId` to `"test"` or any random value.

