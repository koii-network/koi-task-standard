export default function audit(state, action) {
  const votes = state.votes;
  const caller = action.caller;
  const input = action.input;
  const id = input.id;
  const triggeredVote = votes.find((vote) => vote.id == id);
  if (SmartWeave.block.height > state.task.open + 50) {
    throw new ContractError("audit is closed. wait for another round");
  }
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
