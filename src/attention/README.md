# Attention Game Contract

Attention Game is one of the koii task. The aim of the attention game is to rewards content creators and publishers relative to the amount of attention they get. 1,000 KOII are minted daily and awarded proportionally to owners based on the number of views relative to the ecosystem.

## How does attention game work.

In attention game there are 3 players;

1.  `Creators`
2.  `Service nodes`
3.  `Witness nodes`

### Creators

Creators are the one who create any work for instance NFT and get reward based on the number of views(attention).

### Service nodes

Service nodes are special nodes in koii ecosystem. To run a service node you have to stake koii to buy a trust in the koii ecosystem. The duty of the service node in the attention game;

- `Recevice PoRTs `
- `Propose Payloads`
- `Audit payloads of other service nodes`
- `Provide a cache`
- `Recevice votes from witness nodes`

### Witness nodes

Witness nodes are nodes that participate in auditing and voting if there is an active vote. The witness nodes they do not interact with the attention contract direct, their vote is done indirect through the service nodes and service node send the votes as a batch to update the state of the contract. The wintness can slash a service node if the node does not send their vote.

## Attention Game Rule

Creator publish a content and register in the attention contract for attention. Viewers view the content and submit Proofs of Real Traffic(PoRT) to the service node. Service node collect and bundles the PoRTs and submit to Arweave. Then witness nodes or other service nodes audit submission, if malicious activity verified service node's(Bundler) stake slashed and if not the data is used to distibute rewards to the content creators per the attention they get for thier content. Each game of attention took 24 hrs and every 24 hrs 1000 koii minted to reward the content creators based on the number of views.

## Contract Source Code

#### SubmitDistribution

- takes `distributionTxId` and `cacheUrl` as input.

- PoRTs that have been send to service node filtered in the format the contract can read and posted in arweave, the transaction id `distributionTxId` is then submitted to contract along with the `cache url` the service node provide So other nodes can audit if the PoRTs are legit.

```bash
 export default async function submitDistribution(state, action) {
  const task = state.task;
  const caller = action.caller;
  const blacklist = state.blacklist;
  const input = action.input;
  const distributionTxId = input.distributionTxId;
  const url = input.cacheUrl;
  const koiiContract = state.koiiContract;
  if (SmartWeave.block.height > task.open + 300) {
    throw new ContractError("proposing is closed. wait for another round");
  }
  if (!distributionTxId || !url) throw new ContractError("Invalid inputs");
  if (typeof distributionTxId !== "string" || typeof url !== "string")
    throw new ContractError("Invalid inputs format");
  if (distributionTxId.length !== 43)
    throw new ContractError("Distribution txId should have 43 characters");
  if (blacklist.includes(caller)) {
    throw new ContractError(
      "Address is in blacklist can not submit distribution"
    );
  }

  const koiiState = await SmartWeave.contracts.readContractState(koiiContract);
  const stakes = koiiState.stakes;
  if (!(caller in stakes)) {
    throw new ContractError(
      "Submittion of PoRTs require minimum stake of 5 koii"
    );
  }
  const callerStakeAmt = stakes[caller].reduce(
    (acc, curVal) => acc + curVal.value,
    0
  );
  if (callerStakeAmt < 5) {
    throw new ContractError("Stake amount is not enough");
  }

  const currentTask = task.proposedPayloads.find(
    (activeTask) => activeTask.block === task.open
  );
  const contractId = SmartWeave.contract.id;
  const tasks = koiiState.tasks;
  const contractTask = tasks.find((task) => task.txId === contractId);
  if (contractTask !== undefined) {
    const rewardedBlock = contractTask.rewardedBlock;
    const prepareDistribution = task.prepareDistribution.filter(
      (distribution) => !distribution.isRewarded
    );
    prepareDistribution.map((distribution) => {
      if (rewardedBlock.includes(distribution.block)) {
        distribution.isRewarded = true;
      }
    });
  }
  task.prepareDistribution = task.prepareDistribution.filter(
    (distribution) => !distribution.isRewarded
  );
  const proposedPayload = currentTask.proposedData.find(
    (payload) => payload.distributer === caller
  );
  if (proposedPayload !== undefined) {
    throw new ContractError(
      `Payload from this${caller} address is already proposed`
    );
  }
  const payload = {
    txId: distributionTxId,
    distributer: caller,
    cacheUrl: url,
    blockHeight: SmartWeave.block.height,
    status: "pending"
  };
  currentTask.proposedData.push(payload);
  return { state };
}


```

#### Audit

- takes `id` as input.

- Audit trigger a vote if nodes find the proposed payloads malicious. `id` is the transaction id of the proposed payload the node found it malicious.

```bash
export default function audit(state, action) {
  const votes = state.votes;
  const caller = action.caller;
  const input = action.input;
  const id = input.id;

  if (!id) throw new ContractError("Invalid input");
  if (typeof id !== "string") throw new ContractError("Invalid input format");
  if (id.length !== 43) {
    throw new ContractError("Input should have 43 characters");
  }
  if (SmartWeave.block.height > state.task.open + 600) {
    throw new ContractError("audit is closed. wait for another round");
  }
  const triggeredVote = votes.find((vote) => vote.id == id);
  if (triggeredVote !== undefined) {
    throw new ContractError(`Vote is triggered with ${id} id`);
  }
  const vote = {
    id: id,
    status: "active",
    voteTrigger: caller,
    yays: 0,
    nays: 0,
    votersList: [],
    bundlers: {}
  };
  votes.push(vote);
  return { state };
}


```

#### BatchAction

- takes `batchTxId` and `voteId` as input.

- The purpose of this function is to submit votes in a batch, so witness nodes do not have to interact to the contract direct, the nodes sent their votes to trusted service node and receive a signed receipt from service node as a proof. Then the service node sumbit the received votes to arweave and interat with the contract.

```bash
export default async function batchAction(state, action) {
  const votes = state.votes;
  const blackList = state.blacklist;
  const caller = action.caller;
  const input = action.input;
  const batchTxId = input.batchFile;
  const voteId = input.voteId;
  if (blackList.includes(caller)) {
    throw new ContractError("Not valid");
  }
  if (
    SmartWeave.block.height > state.task.open + 660 ||
    SmartWeave.block.height < state.task.open + 600
  ) {
    throw new ContractError("Batch time have passed or not reached yet");
  }
  if (!batchTxId || !voteId) throw new ContractError("Invalid inputs");
  if (typeof batchTxId !== "string" || typeof voteId !== "string")
    throw new ContractError("Invalid input format");
  if (batchTxId.length !== 43 || voteId.length !== 43)
    throw new ContractError("Inputs should have 43 characters");

  const vote = votes.find((vote) => vote.id === voteId);
  const batch = await SmartWeave.unsafeClient.transactions.getData(batchTxId, {
    decode: true,
    string: true
  });
  const batchInArray = batch.split();
  const voteArray = JSON.parse(batchInArray);
  for (let voteObj of voteArray) {
    const dataInString = JSON.stringify(voteObj.vote);
    const voteBuffer = await SmartWeave.arweave.utils.stringToBuffer(
      dataInString
    );
    const rawSignature = await SmartWeave.arweave.utils.b64UrlToBuffer(
      voteObj.signature
    );
    const isVoteValid = await SmartWeave.arweave.crypto.verify(
      voteObj.owner,
      voteBuffer,
      rawSignature
    );
    if (
      isVoteValid &&
      voteObj.vote.voteId === voteId &&
      !vote.votersList.includes(voteObj.senderAddress)
    ) {
      if (voteObj.vote.userVote === "true") {
        vote["yays"] += 1;
        vote.votersList.push(voteObj.senderAddress);
      }
      if (voteObj.vote.userVote === "false") {
        vote["nays"] += 1;
        vote.votersList.push(voteObj.senderAddress);
      }
    }
  }
  if (!(caller in vote.bundlers)) vote.bundlers[caller] = [];
  vote.bundlers[caller].push(batchTxId);
  return { state };
}

```

#### ProposeSlash

- takes `receiptTxId` as input.

- Witness node slash service node if the service node does not submit the node vote to the contract. If the contract found the receipt valid the service node slashed.

```bash
export default async function proposeSlash(state, action) {
  const votes = state.votes;
  const validBundlers = state.validBundlers;
  const blackList = state.blackList;
  const receiptTxId = action.input.receiptTxId;
  if (
    SmartWeave.block.height > state.task.close ||
    SmartWeave.block.height < state.task.open + 660
  ) {
    throw new ContractError("slash time have passed or not reached yet");
  }
  if (!receiptTxId) throw new ContractError("Invalid input");
  if (typeof receiptTxId !== "string")
    throw new ContractError("Invalid input format");
  if (receiptTxId.length !== 43) {
    throw new ContractError("Input should have 43 characters");
  }
  const receiptData = await SmartWeave.unsafeClient.transactions.getData(
    receiptTxId,
    {
      decode: true,
      string: true
    }
  );
  const receipt = JSON.parse(receiptData);
  const payload = receipt.vote;
  const vote = payload.vote;
  const voteId = vote.voteId;
  const voterAddress = await SmartWeave.arweave.wallets.ownerToAddress(
    payload.owner
  );
  const suspectedVote = votes.find((vote) => vote.id === voteId);
  const votersList = suspectedVote.votersList;
  if (votersList.includes(voterAddress))
    throw new ContractError("vote is found");
  const voteString = JSON.stringify(vote);
  const voteBuffer = await SmartWeave.arweave.utils.stringToBuffer(voteString);
  const rawSignature = await SmartWeave.arweave.utils.b64UrlToBuffer(
    payload.signature
  );
  const isVoteValid = await SmartWeave.arweave.crypto.verify(
    payload.owner,
    voteBuffer,
    rawSignature
  );
  if (!isVoteValid) throw new ContractError("vote is not valid");
  const receiptString = JSON.stringify(payload);
  const receiptBuffer = await SmartWeave.arweave.utils.stringToBuffer(
    receiptString
  );
  const rawReceiptSignature = await SmartWeave.arweave.utils.b64UrlToBuffer(
    receipt.signature
  );
  const isReceiptValid = await SmartWeave.arweave.crypto.verify(
    receipt.owner,
    receiptBuffer,
    rawReceiptSignature
  );
  if (!isReceiptValid) throw new ContractError("receipt is not valid");
  const bundlerAddress = await SmartWeave.arweave.wallets.ownerToAddress(
    receipt.owner
  );
  const index = validBundlers.indexOf(bundlerAddress);
  if (index > -1) {
    validBundlers.splice(index, 1);
  }
  blackList.push(bundlerAddress);
  if (vote.userVote === "true") {
    suspectedVote.yays += 1;
  }
  if (vote.userVote === "false") {
    suspectedVote.nays += 1;
  }
  votersList.push(voterAddress);
  return { state };
}

```

#### MigratePreRegister

- does not take an input.

- Migrate the preregistered nft from koii Contract.

```bash
export default async function migratePreRegister(state) {
  const nfts = state.nfts;
  const mainContactId = state.koiiContract;
  const contractId = SmartWeave.contract.id;
  const contractState = await SmartWeave.contracts.readContractState(
    mainContactId
  );
  const preRegisterDatas = contractState.preRegisterDatas;
  const preRegisterNfts = preRegisterDatas.filter(
    (preRegisterNft) =>
      "nft" in preRegisterNft.content &&
      preRegisterNft.contractId === contractId
  );
  const registeredNfts = Object.values(nfts).reduce(
    (acc, curVal) => acc.concat(curVal),
    []
  );

  for (let i = 0; i < preRegisterNfts.length; i++) {
    if (!registeredNfts.includes(preRegisterNfts[i].content.nft)) {
      if (preRegisterNfts[i].owner in nfts) {
        {
          nfts[preRegisterNfts[i].owner].push(preRegisterNfts[i].content.nft);
        }
      } else {
        nfts[preRegisterNfts[i].owner] = [preRegisterNfts[i].content.nft];
      }
    }
  }

  return { state };
}



```

#### Rank

- does not take an input.

- rank the proposed payload and prepare a distribution where then read by the koii contract to reward the content creators based on the attention they get.

```bash
export default async function rankPrepDistribution(state) {
  const votes = state.votes;
  const task = state.task;
  const score = state.reputation;
  const blacklist = state.blacklist;
  const prepareDistribution = task.prepareDistribution;
  const attentionReport = task.attentionReport;
  const nfts = state.nfts;
  if (SmartWeave.block.height < task.close) {
    throw new ContractError(
      `Ranking is in ${task.close - SmartWeave.block.height} blocks`
    );
  }
  const currentProposed = task.proposedPayloads.find(
    (proposedData) => proposedData.block === task.open
  );

  const proposeDatas = currentProposed.proposedData;
  const acceptedProposedTxIds = [];

  // Get active votes
  const activeVotes = votes.filter((vote) => vote.status === "active");
  // Get accepted proposed payloads
  proposeDatas.map((proposeData) => {
    if (activeVotes.length !== 0) {
      for (let vote of activeVotes) {
        vote.status = "passed";
        vote.id === proposeData.txId && vote.yays > vote.nays
          ? ((proposeData.status = "rejected"),
            blacklist.push(proposeData.distributer))
          : ((proposeData.status = "accepted"),
            acceptedProposedTxIds.push(proposeData.txId));
      }
    } else {
      proposeData.status = "accepted";
      acceptedProposedTxIds.push(proposeData.txId);
    }
  });
  // deduplicate PoRts
  const distribution = {};
  await Promise.allSettled(
    acceptedProposedTxIds.map(async (acceptedProposedTxId) => {
      const data = await SmartWeave.unsafeClient.transactions.getData(
        acceptedProposedTxId,
        {
          decode: true,
          string: true
        }
      );
      const proposedPayload = proposeDatas.find(
        (proposeData) => proposeData.txId === acceptedProposedTxId
      );
      let scoreSum = 0;
      const parseData = JSON.parse(data.split());
      const parseDataKeys = Object.keys(parseData);
      const registeredNfts = Object.values(nfts).reduce(
        (acc, curVal) => acc.concat(curVal),
        []
      );
      parseDataKeys.map(async (key) => {
        if (registeredNfts.includes(key)) {
          scoreSum += [...new Set(parseData[key])].length;
          !(key in distribution)
            ? (distribution[key] = [...new Set(parseData[key])])
            : (distribution[key] = [
                ...new Set(distribution[key].concat(parseData[key]))
              ]);
        }
      });
      score[proposedPayload.distributer] = scoreSum;
    })
  );

  let totalAttention = 0;
  const attentionScore = {};
  for (let key in distribution) {
    attentionScore[key] = distribution[key].length;
    totalAttention += distribution[key].length;
  }
  const rewardPerAttention = totalAttention !== 0 ? 1000 / totalAttention : 0;
  // Distributing Reward to owners
  const distributionReward = {};
  await Promise.allSettled(
    Object.keys(distribution).map(async (nftId) => {
      const state = await SmartWeave.contracts.readContractState(nftId);
      const balances = Object.values(state.balances).reduce(
        (preValue, curValue) => preValue + curValue
      );

      for (let address in state.balances) {
        if (typeof address === "string" && address.length === 43) {
          let rewardPer = state.balances[address] / balances;
          if (rewardPer !== 0 && !isNaN(rewardPer)) {
            address in distributionReward
              ? (distributionReward[address] +=
                  distribution[nftId].length * rewardPerAttention * rewardPer)
              : (distributionReward[address] =
                  distribution[nftId].length * rewardPerAttention * rewardPer);
          }
        }
      }
    })
  );
  currentProposed.isRanked = true;
  prepareDistribution.push({
    block: task.open,
    distribution: distributionReward,
    isRewarded: false
  });
  attentionReport.push(attentionScore);
  // Open a new game
  task.open = SmartWeave.block.height;
  task.close = SmartWeave.block.height + 720; // 60
  const newTask = {
    block: task.open,
    proposedData: [],
    isRanked: false
  };
  task.proposedPayloads.push(newTask);
  // Delete Distributed Payloads
  task.proposedPayloads = task.proposedPayloads.filter(
    (payload) => !payload.isRanked
  );
  return { state };
}


```

#### RegisterExecutable

- takes `executableId` as input.

- Only owner of the contract can register the executable id.

```bash
export default function registerExecutableId(state, action) {
  const input = action.input;
  const caller = action.caller;
  const executableId = input.executableId;
  const owner = state.owner;
  if (caller !== owner) {
    throw new ContractError("Only owner can register");
  }
  if (!executableId) throw new ContractError("Invalid input");
  if (typeof executableId !== "string")
    throw new ContractError("Invalid input format");
  if (executableId.length !== 43)
    throw new ContractError("Input should have 43 characters");

  state.executableId = executableId;
  return { state };
}



```

## Testing Contract

`yarn build`

- `node test/attention.test.js path/to/wallet.json`
