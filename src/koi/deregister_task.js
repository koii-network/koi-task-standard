export default function deregisterTask(state, action) {
  const caller = action.caller;
  state.koiTasks = state.tasks.filter((e) => {
    if (e.owner !== caller) {
      throw new ContractError("only owner of the task can delete a task");
    }
    e.txId != action.input.taskTxId;
  });
  return { state };
}
