export default function deregisterTask(state, action) {
  const caller = action.caller;
  state.koiTasks = state.tasks.filter((e) => {
    if (e.TaskOwner !== caller) {
      throw new ContractError("only owner of the task can delete a task");
    }
    e.TaskId != action.input.taskId;
  });
  return { state };
}
