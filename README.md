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

- `yarn execute attention`
- `yarn execute attention service` to test service mode


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

 

 

 
 

