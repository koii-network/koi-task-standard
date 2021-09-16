export default async function proposeSlash(state, action) {
  const votes = state.votes;
  const validBundlers = state.validBundlers;
  const blackList = state.blackList;
  const receiptTxId = action.input.receiptTxId;
  if (
    SmartWeave.block.height > state.task.close ||
    SmartWeave.block.height < state.task.open + 660
  ) {
    throw new ContractError("slash time have passed or not reached yet");
  }
  if (!receiptTxId) throw new ContractError("Invalid input");
  if (typeof receiptTxId !== "string")
    throw new ContractError("Invalid input format");
  if (receiptTxId.length !== 43) {
    throw new ContractError("Input should have 43 characters");
  }
  const receiptData = await SmartWeave.unsafeClient.transactions.getData(
    receiptTxId,
    {
      decode: true,
      string: true
    }
  );
  const receipt = JSON.parse(receiptData);
  const payload = receipt.vote;
  const vote = payload.vote;
  const voteId = vote.voteId;
  const voterAddress = await SmartWeave.arweave.wallets.ownerToAddress(
    payload.owner
  );
  const suspectedVote = votes.find((vote) => vote.id === voteId);
  const votersList = suspectedVote.votersList;
  if (votersList.includes(voterAddress))
    throw new ContractError("vote is found");
  const voteString = JSON.stringify(vote);
  const voteBuffer = await SmartWeave.arweave.utils.stringToBuffer(voteString);
  const rawSignature = await SmartWeave.arweave.utils.b64UrlToBuffer(
    payload.signature
  );
  const isVoteValid = await SmartWeave.arweave.crypto.verify(
    payload.owner,
    voteBuffer,
    rawSignature
  );
  if (!isVoteValid) throw new ContractError("vote is not valid");
  const receiptString = JSON.stringify(payload);
  const receiptBuffer = await SmartWeave.arweave.utils.stringToBuffer(
    receiptString
  );
  const rawReceiptSignature = await SmartWeave.arweave.utils.b64UrlToBuffer(
    receipt.signature
  );
  const isReceiptValid = await SmartWeave.arweave.crypto.verify(
    receipt.owner,
    receiptBuffer,
    rawReceiptSignature
  );
  if (!isReceiptValid) throw new ContractError("receipt is not valid");
  const bundlerAddress = await SmartWeave.arweave.wallets.ownerToAddress(
    receipt.owner
  );
  const index = validBundlers.indexOf(bundlerAddress);
  if (index > -1) {
    validBundlers.splice(index, 1);
  }
  blackList.push(bundlerAddress);
  if (vote.userVote === "true") {
    suspectedVote.yays += 1;
  }
  if (vote.userVote === "false") {
    suspectedVote.nays += 1;
  }
  votersList.push(voterAddress);
  return { state };
}
