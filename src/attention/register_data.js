export default async function registerData(state, action) {
  const registeredRecords = state.registeredRecords;
  const caller = action.caller;
  const input = action.input;
  const nftTxId = input.nftTxId;
  const burnTxId = input.burnTxId;
  const ownerWallet = input.owner;
  // check is txId is valid
  if (!nftTxId) throw new ContractError("No txid specified");
  if (!burnTxId) throw new ContractError("burn koi tx is not specified");
  let transaction = await SmartWeave.unsafeClient.transactions.get(burnTxId);
  if (!transaction) {
    throw new ContractError("Transaction not found");
  }
  let owner = transaction.owner;
  let ownerAddress = await SmartWeave.unsafeClient.wallets.ownerToAddress(
    owner
  );
  if (ownerAddress !== caller) {
    throw new ContractError("burn tx address does not match caller address");
  }
  const tags = transaction.tags;
  let tagsObj = {};
  tags.forEach((tag) => {
    let key = tag.get("name", { decode: true, string: true });
    let value = tag.get("value", { decode: true, string: true });
    tagsObj[key] = value;
  });
  const inputTag = JSON.parse(tagsObj.Input);
  const burnNft = inputTag.nftTxId;
  if (burnNft !== nftTxId) {
    throw new ContractError("koi not burned ");
  }
  if (nftTxId in registeredRecords) {
    throw new ContractError(
      `Transaction/content has been registered already under ${registeredRecords[nftTxId]} wallet`
    );
  }
  registeredRecords[nftTxId] = ownerWallet || caller;
  //balances[caller] -= 1;
  return { state };
}
