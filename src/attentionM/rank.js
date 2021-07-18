export default async function rankAndPrepareDistribution(state) {
  const votes = state.votes;
  const task = state.task;
  const prepareDistribution = task.prepareDistribution;
  const registeredRecords = state.registeredRecords;
  const currentProposed = task.proposedPaylods.find(
    (proposedData) => proposedData.block === task.open
  );

  const proposeDatas = currentProposed.proposedDatas;
  let acceptedProposedTxIds = [];
  proposeDatas.map((proposeData) => {
    if (votes.length !== 0) {
      for (let vote of votes) {
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
      parseDataKeys.forEach((key) => {
        if (key in registeredRecords) {
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
  const keys = Object.keys(distribution);

  keys.forEach((key) => {
    distributionReward[registeredRecords[key]] =
      distribution[key].length * rewardPerAttention;
  });
  currentProposed.isRanked = true;
  prepareDistribution.push({
    block: task.open,
    distribution: distributionReward,
    isRewardAddToMainContract: false
  });
  task.open = SmartWeave.block.height;
  task.close = SmartWeave.block.height + 720;
  const newTask = {
    block: task.open,
    proposedDatas: [],
    isRanked: false
  };
  task.proposedPaylods.push(newTask);
  return { state };
}
