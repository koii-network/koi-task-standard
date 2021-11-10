export default function audit(state, action) {
  const votes = state.votes;
  const caller = action.caller;
  const input = action.input;
  const id = input.id;
  const task = state.tasks[0];

  if (!id) throw new ContractError("Invalid input");
  if (typeof id !== "string") throw new ContractError("Invalid input format");
  if (id.length !== 43) {
    throw new ContractError("Input should have 43 characters");
  }
  //600
  if (SmartWeave.block.height > task.open + 50) {
    throw new ContractError("audit is closed. wait for another round");
  }
  const triggeredVote = votes.find((vote) => vote.id == id);
  if (triggeredVote !== undefined) {
    throw new ContractError(`Vote is triggered with ${id} id`);
  }
  const vote = {
    id: id,
    status: "active",
    voteTrigger: caller,
    yays: 0,
    nays: 0,
    votersList: [],
    bundlers: {}
  };
  votes.push(vote);
  return { state };
}
