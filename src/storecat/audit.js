// The Audit function can be included optionall as a way of invoking a stake slashing behavior to penalize bad actors
async function getWinner() {

}

export default async function audit(state, action) {
  const tasks = state.tasks;
  const caller = action.caller;
  const input = action.input;

  if(tasks.length == 0) throw new ContractError("There is no tasks to audit");
  for(let i = 0; i < tasks.length; i++) {
    // async function
  }
  if (SmartWeave.block.height > state.task.open + 600) {
    throw new ContractError("audit is closed. wait for another round");
  }
  const triggeredVote = votes.find((vote) => vote.id == id);
  if (triggeredVote !== undefined) {
    throw new ContractError(`Vote is triggered with ${id} id`);
  }
  return { state };
}
