export default async function savePayload(state, action) {
  const tasks = state.tasks;
  const input = action.input;
  const matchIndex = input.matchIndex;
  
  if(typeof matchIndex !== 'number') {
    throw new ContractError("Task index should be a number");
  }

  // call interactWrite func update task
  const task = tasks[matchIndex];
  // update completed task 
  const completedTask = {
    uuid: task.uuid,
    owner: task.owner,
    tdId: task.tId
  };
  state.completedTasks.push(completedTask);
  // remove task body
  tasks.splice(matchIndex, 1);
  return { state };
}