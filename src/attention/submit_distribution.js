export default async function submitDistribution(state, action) {
  const task = state.task;
  const caller = action.caller;
  const mainContractId = state.koiiContract;
  const input = action.input;
  const distributionTxId = input.distributionTxId;
  const url = input.cacheUrl;
  const contractId = input.contractId;
  if (SmartWeave.block.height > task.open + 12) {
    throw new ContractError("proposing is closed. wait for another round");
  }
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
  const proposedPayload = currentTask.proposedData.find(
    (payload) => payload.distributer === caller
  );
  if (proposedPayload !== undefined) {
    throw new ContractError(
      `Payload from this${caller} address is already proposed`
    );
  }
  const payload = {
    txId: distributionTxId,
    distributer: caller,
    cacheUrl: url,
    blockHeight: SmartWeave.block.height,
    status: "pending"
  };
  currentTask.proposedData.push(payload);
  return { state };
}
