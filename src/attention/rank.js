export default async function rankPrepDistribution(state) {
  const votes = state.votes;
  const task = state.task;
  const prepareDistribution = task.prepareDistribution;
  const registeredRecords = state.registeredRecords;
  if (SmartWeave.block.height < task.close) {
    throw new ContractError(
      `Ranking is in ${task.close - SmartWeave.block.height} blocks`
    );
  }
  const currentProposed = task.proposedPayloads.find(
    (proposedData) => proposedData.block === task.open
  );
  if (currentProposed.isRanked) {
    throw new ContractError("It is Ranked");
  }
  const proposeDatas = currentProposed.proposedData;
  let acceptedProposedTxIds = [];
  proposeDatas.map((proposeData) => {
    if (votes.length !== 0) {
      for (let vote of votes) {
        vote.status = "passed";
        if (vote.id === proposeData.id && vote.yays > vote.nays) {
          proposeData.status = "rejected";
        } else {
          proposeData.status = "accepted";
          acceptedProposedTxIds.push(proposeData.txId);
        }
      }
    } else {
      proposeData.status = "accepted";
      acceptedProposedTxIds.push(proposeData.txId);
    }
  });
  let distribution = {};

  await Promise.all(
    acceptedProposedTxIds.map(async (acceptedProposedTxId) => {
      const data = await SmartWeave.unsafeClient.transactions.getData(
        acceptedProposedTxId,
        {
          decode: true,
          string: true
        }
      );
      const splitData = data.split();
      const parseData = JSON.parse(splitData);
      const parseDataKeys = Object.keys(parseData);
      const registeredNfts = Object.values(registeredRecords);
      parseDataKeys.map((key) => {
        if (registeredNfts.some((nfts) => nfts.includes(key))) {
          if (!(key in distribution)) {
            distribution[key] = [...new Set(parseData[key])];
          } else {
            distribution[key] = [
              ...new Set(distribution[key].concat(parseData[key]))
            ];
          }
        }
      });
    })
  );
  let totalAttention = 0;
  for (let key in distribution) {
    let attention = distribution[key].length;
    totalAttention += attention;
  }
  let rewardPerAttention = 0;
  if (totalAttention !== 0) {
    rewardPerAttention = 1000 / totalAttention;
  }
  // Distributing Reward to owners
  let distributionReward = {};
  const nftIds = Object.keys(distribution);
  await Promise.allSettled(
    nftIds.map(async (nftId) => {
      const state = await SmartWeave.contracts.readContractState(nftId);
      const balances = Object.values(state.balances).reduce(
        (preValue, curValue) => preValue + curValue
      );
      if (balances !== 0) {
        for (let address in state.balances) {
          let rewardPer = state.balances[address] / balances;
          if (rewardPer !== 0) {
            if (address in distributionReward) {
              distributionReward[address] +=
                distribution[nftId].length * rewardPerAttention * rewardPer;
            } else {
              distributionReward[address] =
                distribution[nftId].length * rewardPerAttention * rewardPer;
            }
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
  task.open = SmartWeave.block.height;
  //task.close = SmartWeave.block.height + 720;
  task.close = SmartWeave.block.height + 30;
  const newTask = {
    block: task.open,
    proposedData: [],
    isRanked: false
  };
  task.proposedPayloads.push(newTask);
  return { state };
}
