export default async function rankPrepDistribution(state) {
  const votes = state.votes;
  const task = state.task;
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
  for (const data of proposeDatas) {
    if (activeVotes.length !== 0) {
      for (let vote of activeVotes) {
        vote.status = "passed";
        vote.id === data.txId && vote.yays > vote.nays
          ? ((data.status = "rejected"), blacklist.push(data.distributer))
          : ((data.status = "accepted"), acceptedProposedTxIds.push(data.txId));
      }
    } else {
      data.status = "accepted";
      acceptedProposedTxIds.push(data.txId);
    }
  }
  // deduplicate PoRts
  const distribution = {};
  const registeredNfts = Object.keys(nfts);
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
      parseDataKeys.map(async (nftId) => {
        if (registeredNfts.includes(nftId)) {
          const balances = Object.values(nfts[nftId]);
          const sumNftBalances = balances.reduce((pv, cv) => pv + cv, 0);
          if (sumNftBalances > 0) {
            scoreSum += [...new Set(parseData[nftId])].length;
            !(nftId in distribution)
              ? (distribution[nftId] = [...new Set(parseData[nftId])])
              : (distribution[nftId] = [
                  ...new Set(distribution[nftId].concat(parseData[nftId]))
                ]);
          }
        }
      });
      proposedPayload.distributer in state.reputation
        ? (state.reputation[proposedPayload.distributer] += scoreSum)
        : (state.reputation[proposedPayload.distributer] = scoreSum);
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
  for (const nft of Object.keys(distribution)) {
    const balances = Object.values(nfts[nft]);
    const balancesSum = balances.reduce((pv, cv) => pv + cv, 0);
    for (let owner in nfts[nft]) {
      let rewardPer = nfts[nft][owner] / balancesSum;
      if (rewardPer > 0 && !isNaN(rewardPer)) {
        owner in distributionReward
          ? (distributionReward[owner] +=
              distribution[nft].length * rewardPerAttention * rewardPer)
          : (distributionReward[owner] =
              distribution[nft].length * rewardPerAttention * rewardPer);
      }
    }
  }
  currentProposed.isRanked = true;
  prepareDistribution.push({
    block: task.open,
    distribution: distributionReward,
    isRewarded: false
  });
  attentionReport.push(attentionScore);
  // Open a new game
  task.open = SmartWeave.block.height;
  task.close = SmartWeave.block.height + 720; //60
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
