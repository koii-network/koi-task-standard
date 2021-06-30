export default function deregisterTask(state, action) {
  const caller = action.caller;
  state.KOI_TASKS = state.KOI_TASKS.filter((e) => {
    if (e.TaskOwner !== caller) {
      throw new ContractError("only owner of the task can delete a task");
    }
    e.TaskId != action.input.taskId;
  });
  return { state };
}
