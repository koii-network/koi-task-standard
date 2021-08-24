export default function burnKoi(state, action) {
  const balances = state.balances;
  const caller = action.caller;
  const preRegisterDatas = state.preRegisterDatas;
  const input = action.input;
  const contractId = input.contractId;
  const contentType = input.contentType;
  const contentTxId = input.contentTxId;

  if (!(caller in balances) || balances[caller] < 1)
    throw new ContractError("you do not have enough koi");
  if (contentType === "nft") {
    const nftState = SmartWeave.contracts.readContractState(contentTxId);
    if (nftState.owner !== caller) {
      throw new ContractError("Only owner can register");
    }
  }
  --balances[caller]; // burn 1 koi per registration
  preRegisterDatas.push({
    contractId: contractId,
    insertBlock: SmartWeave.block.height,
    content: { [contentType]: contentTxId },
    owner: caller
  });
  return { state };
}
