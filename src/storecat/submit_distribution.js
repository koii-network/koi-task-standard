/* eslint-disable no-undef */
// the distribution event governs when the stake will be released from the master koii contract

export default async function submitDistribution(state, action) {
  const task = state.task;
  const caller = action.caller;
  const input = action.input;
  const distributionTxId = input.distributionTxId;
  const url = input.cacheUrl;
  const koiiContract = state.koiiContract;
  if (SmartWeave.block.height > task.open + 300) {
    throw new ContractError("proposing is closed. wait for another round");
  }
  if (!distributionTxId || !url) throw new ContractError("Invalid inputs");
  if (typeof distributionTxId !== "string" || typeof url !== "string")
    throw new ContractError("Invalid inputs format");
  if (distributionTxId.length !== 43)
    throw new ContractError("Distribution txId should have 43 characters");

  const koiiState = await SmartWeave.contracts.readContractState(koiiContract);

  const currentTask = task.proposedPayloads.find(
    (activeTask) => activeTask.block === task.open
  );
  const contractId = SmartWeave.contract.id;
  const tasks = koiiState.tasks;
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
