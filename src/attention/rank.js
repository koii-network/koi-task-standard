export default async function rankAndPrepareDistribution(state) {
  const votes = state.votes;
  const task = state.task;
  const prepareDistribution = task.prepareDistribution;
  const registeredRecords = state.registeredRecords;
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
      parseDataKeys.forEach((key) => {
        if (registeredNfts.some((nfts) => nfts.includes(key))) {
          if (!(key in distribution)) {
            distribution[key] = parseData[key];
          } else {
            parseData[key].forEach((address) => {
              if (!distribution[key].includes(address)) {
                distribution[key].push(address);
              }
            });
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
  let distributionReward = {};
  const nftIds = Object.keys(distribution);
  const nftOwners = Object.keys(registeredRecords);
  nftOwners.map((nftOwner) => {
    nftIds.forEach((nftId) => {
      if (registeredRecords[nftOwner].includes(nftId)) {
        distributionReward[nftOwner] =
          distribution[nftId].length * rewardPerAttention;
      }
    });
  });
  currentProposed.isRanked = true;
  prepareDistribution.push({
    block: task.open,
    distribution: distributionReward,
    isRewarded: false
  });
  task.open = SmartWeave.block.heigh;
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