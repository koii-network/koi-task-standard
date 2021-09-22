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
  Object.keys(distribution).map((nft) => {
    const balances = Object.values(registeredNfts[nft]);
    const balancesSum = balances.reduce((pv, cv) => pv + cv, 0);
    for (let owner in registeredNfts[nft]) {
      let rewardPer = registeredNfts[nft][owner] / balancesSum;
      if (rewardPer !== 0 && !isNaN(rewardPer)) {
        owner in distributionReward
          ? (distributionReward[owner] +=
              distribution[nft].length * rewardPerAttention * rewardPer)
          : (distributionReward[owner] =
              distribution[nft].length * rewardPerAttention * rewardPer);
      }
    }
  });

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
