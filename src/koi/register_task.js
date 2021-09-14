export default async function registerTask(state, action) {
  const balances = state.balances;
  const caller = action.caller;
  const input = action.input;
  const taskName = input.taskName;
  const taskTxId = input.taskTxId;
  const koiReward = input.koiReward;
  if (caller !== state.owner) {
    throw new ContractError("Only owner can register a task");
  }
  if (!taskTxId) throw new ContractError("No txid specified");
  if (typeof taskTxId !== "string")
    throw new ContractError("taskTxId should be string");
  if (!taskName) throw new ContractError("Task name not specified");
  if (!(typeof taskName === "string"))
    throw new ContractError("Task name should be string");
  if (koiReward && balances[caller] < koiReward + 1)
    throw new ContractError("Your Balance is not enough");
  const txId = state.tasks.find((task) => task.txId === taskTxId);
  if (txId !== undefined) {
    throw new ContractError(`task with ${txId}id is already registered `);
  }
  // Required to start caching this task state in kohaku
  await SmartWeave.contracts.readContractState(taskTxId);
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
