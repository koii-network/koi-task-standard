export default function audit(state, action) {
  const votes = state.votes;
  const task = state.task;
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
    status: "active",
    descripition: descripition,
    voteTrigger: caller,
    yays: 0,
    nays: 0,
    votersList: [],
    open: task.open,
    close: task.close
  };
  votes.push(vote);
  return { state };
}
