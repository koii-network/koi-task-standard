export default async function distributeRewards(state, action) {
  const balances = state.balances;
  const koi_tasks = state.KOI_TASKS;
  const input = action.input;
  const taskId = input.taskId;
  const task = koi_tasks.find((task) => task.TaskId === taskId);
  const TASK_CONTRACT = task.TaskTxId;
  const taskType = task.TaskName;
  if (taskType === "AttentionGame") {
    const contractState = await SmartWeave.contracts.readContractState(
      TASK_CONTRACT
    );
    const rewardReport = contractState.task.rewardReport;
    for (let blockHeight of task.TrafficBlockRewarded) {
      const report = rewardReport.find(
        (distributionReport) =>
          distributionReport.dailyTrafficBlock === blockHeight
      );
      if (report.distribution) {
        const index = task.TrafficBlockRewarded.indexOf(blockHeight);
        if (index > -1) {
          task.TrafficBlockRewarded.splice(index, 1);
        }
      }
    }
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
