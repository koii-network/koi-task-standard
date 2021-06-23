export default async function proposeSlash(state, action) {
  const votes = state.votes;
  const validBundlers = state.validBundlers;
  const blackList = state.blackList;
  const receiptTxId = action.input.receiptTxId;

  // if (
  //   SmartWeave.block.height > trafficLogs.close - 75 ||
  //   SmartWeave.block.height < trafficLogs.close - 150
  // ) {
  //   throw new ContractError("Slash time not reached or passed");
  // }

  if (!receiptTxId) throw new ContractError("No receipt specified");

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
  const voterAddress = await SmartWeave.arweave.wallets.ownerToAddress(
    payload.owner
  );
  const suspectedVote = votes[vote.voteId].voted;

  if (suspectedVote.includes(voterAddress))
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

  return { state };
}
