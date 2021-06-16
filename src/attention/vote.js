export default async function vote(state, action) {
  const votes = state.votes;
  const caller = action.caller;
  const input = action.input;
  const voteId = input.voteId;
  const userVote = input.userVote;

  if (typeof userVote !== "boolean") {
    throw new ContractError(
      'Invalid value for "user vote". Must be true or false'
    );
  }
  if (!Number.isInteger(voteId)) {
    throw new ContractError(
      'Invalid value for "voting id". Must be an integer'
    );
  }
  const vote = votes[voteId];
  if (SmartWeave.block.height > vote.end || vote.status == "passive") {
    throw new ContractError("vote passed");
  }

  const voted = vote.voted;
  const MAIN_CONTRACT = "Bq6dib6GLqe-rFspNXqmIbZspMNchdPAjTPKV6-vwNE";
  const tokenContractState = await SmartWeave.contracts.readContractState(
    MAIN_CONTRACT
  );
  const stakes = tokenContractState.stakes;
  if (stakes[caller] < vote.stakeAmount)
    throw new ContractError("staked amount is less than than required");
  if (voted.includes(caller))
    throw new ContractError("caller has alreday voted in this evet");

  if (userVote) vote["yays"] += 1;
  else vote["nays"] += 1;
  voted.push(caller);

  return { state };
}
