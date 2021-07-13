export default function registerTask(state, action) {
  const balances = state.balances;
  const caller = action.caller;
  const input = action.input;
  const taskId = input.taskId;
  const taskName = input.taskname;
  const taskTxId = input.taskTxId;
  const KOI_Reward = input.KOI_Reward;
  if (!taskTxId) throw new ContractError("No txid specified");
  if (!(caller in balances) || balances[caller] < 1)
    throw new ContractError("you need min 1 KOI to register data");
  if (taskName === "AttentionGame") {
    state.KOI_TASKS.push({
      TaskId: taskId,
      TaskOwner: caller,
      TaskName: taskName,
      TaskTxId: taskTxId,
      TrafficBlockRewarded: []
    });
  } else {
    state.KOI_TASKS.push({
      TaskId: taskId,
      TaskOwner: caller,
      TaskName: taskName,
      TaskTxId: taskTxId,
      Bounty: KOI_Reward,
      lockBounty: {
        [caller]: KOI_Reward
      }
    });
    balances[caller] -= KOI_Reward;
  }
  --balances[caller]; // burn 1 koi per registration
  return { state };
}
