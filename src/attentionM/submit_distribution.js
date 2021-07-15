export default function submitDistribution(state, action) {
  const caller = action.caller;
  const input = action.input;
  const distributionTxId = input.distributionTxId;
  const url = input.cacheUrl;
  const task = state.task;
  const id = "w3ZHPciJ09CPxB0HA5f2gtyD4tFA0OCaBiTFCrnfAdw";
  const currentTask = task.dailyProposedDistribution.find(
    (activeTask) => activeTask.block === task.open
  );

  const payload = {
    distribution: distributionTxId,
    distributer: caller,
    cacheUrl: url,
    id: SmartWeave.transaction.id,
    blockHeight: SmartWeave.block.height,
    status: "pending"
  };
  currentTask.proposedDistribution.push(payload);
  return { state };
}
