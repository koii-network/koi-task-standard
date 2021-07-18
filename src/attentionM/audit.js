export default function auditPropose(state, action) {
  const votes = state.votes;
  const caller = action.caller;
  const input = action.input;
  const descripition = input.descripition;
  const id = input.id;
  const triggeredVote = votes.find((vote) => vote.id == id);
  if (triggeredVote !== undefined) {
    throw new ContractError(`Vote is triggered with ${id} id`);
  }
  const vote = {
    id: id,
    descripition: descripition,
    voteTrigger: caller,
    yays: 0,
    nays: 0,
    votersList: []
  };
  votes.push(vote);
  return { state };
}
