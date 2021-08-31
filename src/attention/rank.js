export default async function rankPrepDistribution(state) {
  const votes = state.votes;
  const task = state.task;
  const score = state.reputation;
  const prepareDistribution = task.prepareDistribution;
  const attentionReport = task.attentionReport;
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
        vote.id === proposeData.txId && vote.yays > vote.nays
          ? (proposeData.status = "rejected")
          : ((proposeData.status = "accepted"),
            acceptedProposedTxIds.push(proposeData.txId));
      }
    } else {
      proposeData.status = "accepted";
      acceptedProposedTxIds.push(proposeData.txId);
    }
  });

  let distribution = {};
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
      const splitData = data.split();
      const parseData = JSON.parse(splitData);
      const parseDataKeys = Object.keys(parseData);
      const registeredNfts = Object.values(registeredRecords);
      parseDataKeys.map(async (key) => {
        if (registeredNfts.some((nfts) => nfts.includes(key))) {
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
  const cheDistirbution = {};
  const attentionScore = {};
  await Promise.allSettled(
    Object.keys(distribution).map(async (key) => {
      const keyStatus = await SmartWeave.unsafeClient.transactions.getStatus(
        key
      );
      if (keyStatus.status === 200) {
        cheDistirbution[key] = distribution[key];
        attentionScore[key] = distribution[key].length;
        let attention = distribution[key].length;
        totalAttention += attention;
      }
    })
  );
  let rewardPerAttention = totalAttention !== 0 ? 1000 / totalAttention : 0;

  // Distributing Reward to owners
  let distributionReward = {};
  const nftIds = Object.keys(cheDistirbution);

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
  attentionReport.push({
    block: task.open,
    attentionScore,
    rewardPerAttention
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
