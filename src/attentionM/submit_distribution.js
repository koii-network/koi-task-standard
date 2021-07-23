export default async function submitDistribution(state, action) {
  const task = state.task;
  const caller = action.caller;
  const input = action.input;
  const distributionTxId = input.distributionTxId;
  const url = input.cacheUrl;
  const mainContractId = input.mainContractId;
  const contractId = input.contractId;
  const currentTask = task.proposedPayloads.find(
    (activeTask) => activeTask.block === task.open
  );
  const mainContractState = await SmartWeave.contracts.readContractState(
    mainContractId
  );
  const tasks = mainContractState.tasks;
  const contractTask = tasks.find((task) => task.txId === contractId);
  if (contractTask !== undefined) {
    const rewardedBlock = contractTask.rewardedBlock;
    const prepareDistribution = task.prepareDistribution.filter(
      (distribution) => !distribution.isRewarded
    );
    prepareDistribution.map((distribution) => {
      if (rewardedBlock.includes(distribution.block)) {
        distribution.isRewarded = true;
      }
    });
  }
  task.prepareDistribution = task.prepareDistribution.filter(
    (distribution) => !distribution.isRewarded
  );
  const payload = {
    id: SmartWeave.transaction.id,
    txId: distributionTxId,
    distributer: caller,
    cacheUrl: url,
    blockHeight: SmartWeave.block.height,
    status: "pending"
  };
  currentTask.proposedDatas.push(payload);
  return { state };
}
