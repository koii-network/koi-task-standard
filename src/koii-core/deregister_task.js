export default function deregisterTask(state, action) {
  const caller = action.caller;
  const txId = action.input.taskTxId;
  if (!txId) throw new ContractError("Invalid input");
  if (typeof txId !== "string") throw new ContractError("Invalid input format");
  if (txId.length !== 43)
    throw new ContractError("Input should have 43 characters");
  const task = state.tasks.find(
    (task) => task.txId === txId && task.owner === caller
  );
  if (!task) {
    throw new ContractError(
      `Task with ${txId} Id and ${caller} owner is not registered`
    );
  }
  const index = state.tasks.indexOf(task);
  state.tasks.splice(index, 1);
  return { state };
}
