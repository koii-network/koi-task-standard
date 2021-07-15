export default function vote(state, action) {
  const input = action.input;
  const caller = action.caller;
  const votes = state.votes;
  const voteId = input.voteId;
  const userVote = input.userVote;

  if (typeof userVote !== "boolean") {
    throw new ContractError(
      'Invalid value for "user vote". Must be true or false'
    );
  }

  const vote = votes.find((vote) => vote.id === voteId);
  const votersList = vote.votersList;
  if (votersList.includes(caller))
    throw new ContractError("caller has alreday voted");

  if (userVote) ++vote["yays"];
  else ++vote["nays"];
  votersList.push(caller);

  return { state };
}
