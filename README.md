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

- `yarn execute attentionM taskTxId`
- `yarn execute attentionM taskTxId bundler` to test bundler mode

If your executable does not make use of `namespace.taskTxId`, you can set `taskTxId` to `"test"` or any random value.

## Testing TestWeave

1. Ensure docker is running (after installing docker and docker-compose)
    ```
    sudo groupadd docker
    sudo usermod -aG docker
    sudo systemctl start docker
    docker run --rm hello-world
    ```
2. Follow install instructions for [TestWeave Docker](https://github.com/ArweaveTeam/testweave-docker)
    ```
    git clone --depth 1 https://github.com/ArweaveTeam/testweave-docker.git
    cd testweave-docker
    docker-compose up -d
    ```
3. Follow install instructions for [TestWeave SDK](https://github.com/ArweaveTeam/testweave-sdk)
    ```
    yarn add testweave-sdk
    ```