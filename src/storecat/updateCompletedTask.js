export default async function addScrapingRequest(state, action) {
  const tasks = state.tasks;
  const input = action.input;
  const matchIndex = input.matchIndex;
  
  // call interactWrite func update task
  const task = tasks[matchIndex];
  // update completed task 
  
  // remove task body
  tasks.push(task);
  return { state };
}