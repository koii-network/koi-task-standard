/* eslint-disable no-undef */
export default async function completeTask(state, action) {
  const tasks = state.tasks;
  const input = action.input;
  const matchIndex = input.matchIndex;

  if (typeof matchIndex !== "number") {
    throw new ContractError("Task index should be a number");
  }

  if (typeof matchIndex < 0) {
    throw new ContractError("Task index should be unsigned number");
  }

  // call interactWrite func update task
  const task = tasks[matchIndex];
  // update completed task
  const completedTask = {
    uuid: task.uuid,
    owner: task.owner,
    txId: task.tId
  };
  state.completedTasks.push(completedTask);
  // remove task from tasks
  tasks.splice(matchIndex, 1);
  return { state };
}
