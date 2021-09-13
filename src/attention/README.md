# Attention Game Contract

Attention Game is one of the koii task. The aim of the attention game is to rewards content creators and publishers relative to the amount of attention they get. 1,000 KOII are minted daily and awarded proportionally to owners based on the number of views relative to the ecosystem.

# How does attention game work.

In attention game there are 3 players;

1.  `Creators`
2.  `Service nodes`
3.  `Witness nodes`

# Creators

Creators are the one who create any work for instance NFT and get reward based on the number of views(attention).

# Service nodes

Service nodes are special nodes in koii ecosystem. To run a service node you have to stake koii to buy a trust in the koii ecosystem. The duty of the service node in the attention game;

- `Recevice PoRTs `
- `Propose Payloads`
- `Audit payloads of other service nodes`
- `Provide a cache`
- `Recevice votes from witness nodes`

# Witness nodes

Witness nodes are nodes that participate in auditing and voting if there is an active vote. The witness nodes they do not interact with the attention contract direct, their vote is done indirect through the service nodes and service node send the votes as a batch to update the state of the contract. The wintness can slash a service node if the node does not send their vote.

# Attention Game Rule

Creator publish a content and register in the attention contract for attention. Viewers view the content and submit Proofs of Real Traffic(PoRT) to the service node. Service node collect and bundles the PoRTs and submit to Arweave. Then witness nodes or other service nodes audit submission, if malicious activity verified service node's(Bundler) stake slashed and if not the data is used to distibute rewards to the content creators per the attention they get for thier content. Each game of attention took 24 hrs and every 24 hrs 1000 koii minted to reward the content creators based on the number of views.

#### Links to Smart Contract Source Code

- [SubmitDistribution](./submit_distribution.js)

- [Audit](./audit.js)

- [BatchAction](./batchAction.js)

- [ProposeSlash](./propose_slash.js)

- [MigratePreRegister](./migrate_pre_register.js)

- [Rank](./rank.js)

- [RegisterExecutable](./register_executbale_id)
