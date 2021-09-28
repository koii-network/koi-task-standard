export default async function batchAction(state, action) {
  const votes = state.votes;
  const blacklist = state.blacklist;
  const caller = action.caller;
  const input = action.input;
  const batchTxId = input.batchFile;
  const voteId = input.voteId;
  if (blacklist.includes(caller)) {
    throw new ContractError("Not valid");
  }
  if (
    SmartWeave.block.height > state.task.open + 660 ||
    SmartWeave.block.height < state.task.open + 600
  ) {
    throw new ContractError("Batch time have passed or not reached yet");
  }
  if (!batchTxId || !voteId) throw new ContractError("Invalid inputs");
  if (typeof batchTxId !== "string" || typeof voteId !== "string")
    throw new ContractError("Invalid input format");
  if (batchTxId.length !== 43 || voteId.length !== 43)
    throw new ContractError("Inputs should have 43 characters");

  const vote = votes.find((vote) => vote.id === voteId);
  const batch = await SmartWeave.unsafeClient.transactions.getData(batchTxId, {
    decode: true,
    string: true
  });
  const batchInArray = batch.split();
  const voteArray = JSON.parse(batchInArray);
  for (let voteObj of voteArray) {
    const dataInString = JSON.stringify(voteObj.vote);
    const voteBuffer = await SmartWeave.arweave.utils.stringToBuffer(
      dataInString
    );
    const rawSignature = await SmartWeave.arweave.utils.b64UrlToBuffer(
      voteObj.signature
    );
    const isVoteValid = await SmartWeave.arweave.crypto.verify(
      voteObj.owner,
      voteBuffer,
      rawSignature
    );
    if (
      isVoteValid &&
      voteObj.vote.voteId === voteId &&
      !vote.votersList.includes(voteObj.senderAddress)
    ) {
      if (voteObj.vote.userVote === "true") {
        vote["yays"] += 1;
        vote.votersList.push(voteObj.senderAddress);
      }
      if (voteObj.vote.userVote === "false") {
        vote["nays"] += 1;
        vote.votersList.push(voteObj.senderAddress);
      }
    }
  }
  if (!(caller in vote.bundlers)) vote.bundlers[caller] = [];
  vote.bundlers[caller].push(batchTxId);
  return { state };
}
