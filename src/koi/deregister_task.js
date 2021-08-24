export default function deregisterTask(state, action) {
  const caller = action.caller;
  const txId = action.input.taskTxId;
  const task = state.tasks.find(
    (task) => task.txId === txId && task.owner === caller
  );
  if (task === undefined) {
    throw new ContractError(
      `task with ${txId} Id and ${caller} owner did not register`
    );
  }
  const index = state.tasks.indexOf(task);
  state.tasks.splice(index, 1);
  return { state };
}
