# Contracts

## Deployment

`yarn deploy [contract]`

Examples:

- `yarn deploy koi`
- `yarn deploy attention`

## Testing executable

- `yarn test attentionM`
- `yarn test attentionM bundler`


## Testing testweave

1. Ensure docker is running 
    ```
    sudo groupadd docker
    sudo usermod -aG docker
    sudo systemctl start docker
    docker run --rm hello-world
    ```
2. Follow install instructions for [TestWeave Docker](https://github.com/ArweaveTeam/testweave-docker)
    ```
    git clone --depth 1 https://github.com/ArweaveTeam/testweave-docker.git
    cd testweaave-docker
    docker-compose up -d
    ```
3. Follow install instructions for [TestWeave SDK](https://github.com/ArweaveTeam/testweave-sdk)
    ```
    yarn add testweave-sdk
    ```