export default async function distributeRewards(state, action) {
  const tasks = state.tasks;
  const input = action.input;
  const taskTxId = input.taskTxId;
  const task = tasks.find((task) => task.txId === taskTxId);
  const taskType = task.name;

  if (taskType === "Attention_Game") {
    const contractState = await SmartWeave.contracts.readContractState(
      taskTxId
    );
    const rewardedBlock = task.rewardedBlock;
    const activeTask = contractState.task.dailyProposedDistribution.find(
      (task) => task.block === contractState.task.open
    );
    if (rewardedBlock.includes(activeTask.block)) {
      throw new ContractError("reward is distributed");
    }
    const currentProposedDatas = activeTask.proposedDistribution;
    const acceptedProposedDatas = currentProposedDatas.filter(
      (currentProposedData) => currentProposedData.status === "accepted"
    );

    let distributionTxIds = [];
    acceptedProposedDatas.map((acceptedProposedData) => {
      distributionTxIds.push(acceptedProposedData.txId);
    });
    let distribution = {};
    await Promise.all(
      distributionTxIds.map(async (distributionTxIds) => {
        const data = await SmartWeave.unsafeClient.transactions.getData(
          distributionTxIds,
          {
            decode: true,
            string: true
          }
        );
        const splitData = data.split();
        const parseData = JSON.parse(splitData);
        const parseDataKeys = Object.keys(parseData);
        parseDataKeys.forEach((key) => {
          if (!(key in distribution)) {
            distribution[key] = parseData[key];
          } else {
            parseData[key].forEach((address) => {
              if (!distribution[key].includes(address)) {
                distribution[key].push(address);
              }
            });
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
    const registeredNfts = contractState.registeredNfts;
    const balances = state.balances;
    const keys = Object.keys(distribution);
    keys.forEach((key) => {
      if (key in registeredNfts) {
        if (balances[registeredNfts[key]]) {
          balances[registeredNfts[key]] +=
            distribution[key].length * rewardPerAttention;
        } else {
          balances[registeredNfts[key]] =
            distribution[key].length * rewardPerAttention;
        }
      }
    });

    rewardedBlock.push(activeTask.block);
  }
  return { state };
}
