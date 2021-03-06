export default async function registerTask(state, action) {
  const balances = state.balances;
  const caller = action.caller;
  const input = action.input;
  const taskName = input.taskName;
  const taskTxId = input.taskTxId;
  const koiReward = input.koiReward;
  if (caller !== SmartWeave.contract.owner) {
    throw new ContractError("Only owner can register a task");
  }
  if (!taskTxId || !taskName) throw new ContractError("Invalid inputs");
  if (typeof taskTxId !== "string" || typeof taskName !== "string")
    throw new ContractError("Invalid inputs format");
  if (!(caller in balances) || balances[caller] < 1)
    throw new ContractError("you do not have enough koi");
  if (koiReward && balances[caller] < koiReward + 1)
    throw new ContractError("Your Balance is not enough");
  const txId = state.tasks.find((task) => task.txId === taskTxId);
  if (txId !== undefined) {
    throw new ContractError(`task with ${txId}id is already registered `);
  }
  // Required to start caching this task state in kohaku
  await SmartWeave.contracts.readContractState(taskTxId);
  --balances[caller]; // burn 1 koi per registration
  koiReward
    ? (state.tasks.push({
        owner: caller,
        name: taskName,
        txId: taskTxId,
        bounty: koiReward,
        rewardedBlock: [],
        lockBounty: {
          [caller]: koiReward
        }
      }),
      (balances[caller] -= koiReward))
    : state.tasks.push({
        owner: caller,
        name: taskName,
        txId: taskTxId,
        rewardedBlock: []
      });

  return { state };
}
