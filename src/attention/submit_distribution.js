export default async function submitDistribution(state, action) {
  const task = state.task;
  const caller = action.caller;
  const input = action.input;
  const distributionTxId = input.distributionTxId;
  const url = input.cacheUrl;
  const koiiContract = state.koiiContract;
  const koiiState = await SmartWeave.contracts.readContractState(koiiContract);
  const stakes = koiiState.stakes;
  if (!(caller in stakes)) {
    throw new ContractError(
      "Submittion of PoRTs require minimum stake of 5 koii"
    );
  }
  let callerStake = 0;
  for (let obj of stakes[caller]) {
    callerStake += obj.value;
  }
  if (callerStake < 5) {
    throw new ContractError("Stake amount is not enough");
  }

  if (SmartWeave.block.height > task.open + 25) {
    throw new ContractError("proposing is closed. wait for another round");
  }
  const transaction = await SmartWeave.unsafeClient.transactions.get(
    SmartWeave.transaction.id
  );
  let contractId;
  transaction.get("tags").forEach((tag) => {
    if (tag.get("name", { decode: true, string: true }) == "Contract") {
      contractId = tag.get("value", { decode: true, string: true });
    }
  });
  const currentTask = task.proposedPayloads.find(
    (activeTask) => activeTask.block === task.open
  );

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
