export default async function registerTask(state, action) {
  const balances = state.balances;
  const caller = action.caller;
  const input = action.input;
  const taskName = input.taskName;
  const taskTxId = input.taskTxId;
  const koiReward = input.koiReward;
  if (!taskTxId) throw new ContractError("No txid specified");
  if (!(caller in balances) || balances[caller] < 1)
    throw new ContractError("you need min 1 KOI to register data");
  // Required to start caching this task state in swicw
  await SmartWeave.contracts.readContractState(taskTxId);
  if (koiReward) {
    state.tasks.push({
      owner: caller,
      name: taskName,
      txId: taskTxId,
      bounty: koiReward,
      rewardedBlock: [],
      lockBounty: {
        [caller]: koiReward
      }
    });
    balances[caller] -= koiReward;
  } else {
    state.tasks.push({
      owner: caller,
      name: taskName,
      txId: taskTxId,
      rewardedBlock: []
    });
  }

  --balances[caller]; // burn 1 koi per registration
  return { state };
}
