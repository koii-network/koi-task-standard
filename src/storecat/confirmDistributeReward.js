export default async function confirmDistributeReward(state, action) {
  const tasks = state.tasks;
  const input = action.input;
  const matchIndex = input.matchIndex;
  
  if(typeof matchIndex !== 'number') {
    throw new ContractError("Task index should be a number");
  }

  
  
  return { state };
}