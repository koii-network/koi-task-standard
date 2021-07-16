export default async function distributeRewards(state, action) {
  const balances = state.balances;
  const tasks = state.tasks;
  const input = action.input;
  const taskTxId = input.taskTxId;
  const task = tasks.find((task) => task.txId === taskTxId);
  const TASK_CONTRACT = task.txId;
  const taskType = task.name;
  if (taskType === "Attention_Game") {
    const contractState = await SmartWeave.contracts.readContractState(
      TASK_CONTRACT
    );
    const rewardReport = contractState.task.rewardReport;
    const rewardedBlock = [];
    for (let blockHeight of task.TrafficBlockRewarded) {
      const report = rewardReport.find(
        (distributionReport) =>
          distributionReport.dailyTrafficBlock === blockHeight
      );
      if (report.distribution) {
        rewardedBlock.push(blockHeight);
      }
    }
    //filtering the distributed blockHieght.
    task.TrafficBlockRewarded = task.TrafficBlockRewarded.filter(
      (blockHeight) => !rewardedBlock.includes(blockHeight)
    );
    // Distributing Reward for not Rewarded blocks
    const unRewardedDistributions = rewardReport.filter(
      (unRewardedDistribution) => unRewardedDistribution.distributed === false
    );
    if (unRewardedDistributions !== undefined) {
      for (let unRewardedDistribution of unRewardedDistributions) {
        let rewardedBlockHeight = task.TrafficBlockRewarded;
        if (
          !rewardedBlockHeight.includes(
            unRewardedDistribution.dailyTrafficBlock
          )
        ) {
          let distributionReport = unRewardedDistribution.distribution;
          for (let address in distributionReport) {
            if (address in balances)
              balances[address] += distributionReport[address];
            else balances[address] = distributionReport[address];
          }
          task.TrafficBlockRewarded.push(
            unRewardedDistribution.dailyTrafficBlock
          );
        } else {
          throw new ContractError("It is already Distributed");
        }
      }
    }
  }
  return { state };
}
