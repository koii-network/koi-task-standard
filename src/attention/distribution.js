export default async function distribution(state, action) {
  const task = state.task;
  const registerRecords = state.registeredRecords;
  const caller = action.caller;
  // if (SmartWeave.block.height < trafficLogs.close) {
  //   throw new ContractError("voting process is ongoing");
  // }
  const currentTask = task.dailyPayload.find(
    (payLoad) => payLoad.block === task.open
  );
  if (currentTask.isDistributed)
    throw new ContractError("Reward is distributed");
  const logSummary = {};
  let totalDataRe = 0;
  const payloads = currentTask.payloads;
  for (var i = 0; i < payloads.length; i++) {
    if (payloads[i].won) {
      const batch = await SmartWeave.unsafeClient.transactions.getData(
        payloads[i].TLTxId,
        { decode: true, string: true }
      );
      const logs = JSON.parse(batch);
      logs.forEach((element) => {
        const contentId = element.url.substring(1);
        if (contentId in registerRecords) {
          totalDataRe += element.addresses.length;
          logSummary[contentId] = element.addresses.length;
        }
      });
    }
  }
  let rewardPerAttention = 0;
  if (totalDataRe !== 0) {
    rewardPerAttention = 1000 / totalDataRe;
  }
  const distribution = {};
  for (const log in logSummary)
    distribution[registerRecords[log]] = logSummary[log] * rewardPerAttention;
  const distributionReport = {
    dailyTrafficBlock: task.open,
    logsSummary: logSummary,
    distribution: distribution,
    distributer: caller,
    distributed: false,
    distributionBlock: SmartWeave.block.height,
    rewardPerAttention: rewardPerAttention
  };
  task.rewardReport.push(distributionReport);
  currentTask.isDistributed = true;
  task.open = SmartWeave.block.height;
  task.close = SmartWeave.block.height + 720;
  const newDailyTL = {
    block: task.open,
    payloads: [],
    isRanked: false,
    isDistributed: false
  };
  task.dailyPayload.push(newDailyTL);
  return { state };
}
