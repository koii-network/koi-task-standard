export default async function rankPrepDistribution(state) {
  const votes = state.votes;
  const task = state.tasks[0];
  const blacklist = state.blacklist;
  const prepareDistribution = task.prepareDistribution;
  const attentionReport = task.attentionReport;
  const nfts = state.contents.nfts;
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
  let registeredContents = [];
  for (let data of Object.values(state.contents)) {
    registeredContents.push(Object.keys(data));
  }
  for (const acceptedProposedTxId of acceptedProposedTxIds) {
    const data = await SmartWeave.unsafeClient.transactions
      .getData(acceptedProposedTxId, {
        decode: true,
        string: true
      })
      .catch((e) => {});
    if (data) {
      const proposedPayload = proposeDatas.find(
        (proposeData) => proposeData.txId === acceptedProposedTxId
      );
      let scoreSum = 0;
      const parseData = JSON.parse(data.split());
      const parseDataKeys = Object.keys(parseData);
      parseDataKeys.forEach((contentId) => {
        if (registeredContents.flat().includes(contentId)) {
          if (registeredNfts.includes(contentId)) {
            const balances = Object.values(nfts[contentId]["owners"]);
            const sumNftBalances = balances.reduce((pv, cv) => pv + cv, 0);
            if (sumNftBalances > 0) {
              scoreSum += [...new Set(parseData[contentId])].length;
              !(contentId in distribution)
                ? (distribution[contentId] = [...new Set(parseData[contentId])])
                : (distribution[contentId] = [
                    ...new Set(
                      distribution[contentId].concat(parseData[contentId])
                    )
                  ]);
            }
          } else {
            scoreSum += [...new Set(parseData[contentId])].length;
            !(contentId in distribution)
              ? (distribution[contentId] = [...new Set(parseData[contentId])])
              : (distribution[contentId] = [
                  ...new Set(
                    distribution[contentId].concat(parseData[contentId])
                  )
                ]);
          }
        }
      });
      proposedPayload.distributer in state.reputation
        ? (state.reputation[proposedPayload.distributer] += scoreSum)
        : (state.reputation[proposedPayload.distributer] = scoreSum);
    }
  }

  let totalAttention = 0;
  const attentionScore = {};
  for (let key in distribution) {
    attentionScore[key] = distribution[key].length;
    totalAttention += distribution[key].length;
  }
  const rewardPerAttention = totalAttention !== 0 ? 1000 / totalAttention : 0;
  // Distributing Reward
  const distributionReward = {};
  for (const content of Object.keys(distribution)) {
    //Rewarding nfts owners and creator
    if (registeredNfts.includes(content)) {
      let reward = distribution[content].length * rewardPerAttention;
      const creator = Object.keys(nfts[content]["creatorShare"])[0];
      const owners = nfts[content]["owners"];
      // Creator reward
      if (!(creator in owners)) {
        const creatorShare = nfts[content]["creatorShare"][creator];
        const creatorReward = reward * creatorShare;
        if (
          creatorReward > 0 &&
          typeof creator === "string" &&
          creator.length === 43 &&
          !(creator.indexOf(" ") >= 0)
        ) {
          creator in distributionReward
            ? (distributionReward[creator] += creatorReward)
            : (distributionReward[creator] = creatorReward);
          reward =
            distribution[content].length * rewardPerAttention - creatorReward;
        }
      }
      //Current owners reward
      const balances = Object.values(owners);
      const balancesSum = balances.reduce((pv, cv) => pv + cv, 0);
      for (let owner in owners) {
        let rewardPer = owners[owner] / balancesSum;
        if (rewardPer > 0 && !isNaN(rewardPer)) {
          owner in distributionReward
            ? (distributionReward[owner] += reward * rewardPer)
            : (distributionReward[owner] = reward * rewardPer);
        }
      }
    } else {
      // Rewarding  genericContents owners
      let reward = distribution[content].length * rewardPerAttention;
      const genericContents = state.contents.genericContents;
      genericContents[content] in distributionReward
        ? (distributionReward[genericContents[content]] += reward)
        : (distributionReward[genericContents[content]] = reward);
    }
  }
  currentProposed.isRanked = true;
  prepareDistribution.push({
    id: task.open,
    distribution: distributionReward,
    isRewarded: false
  });
  attentionReport.push(attentionScore);
  // Open a new game
  task.open = SmartWeave.block.height;
  task.close = SmartWeave.block.height + 60; //720
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
