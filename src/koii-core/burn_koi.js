export default function burnKoi(state, action) {
  const balances = state.balances;
  const caller = action.caller;
  const input = action.input;
  const contractId = input.contractId;
  const contentType = input.contentType;
  const contentTxId = input.contentTxId;
  if (!contractId || !contentType || !contentTxId)
    throw new ContractError("Invalid inputs");
  if (typeof contractId !== "string" || typeof contentTxId !== "string") {
    throw new ContractError("Invalid inputs format");
  }
  if (contractId.length !== 43 || contentTxId.length !== 43) {
    throw new ContractError("Inputs should have 43 characters");
  }
  if (!(caller in balances) || balances[caller] < 1)
    throw new ContractError("You do not have enough koi");

  //clean  10000 block old data
  // 10000
  state.preRegisterDatas = state.preRegisterDatas.filter(
    (data) => data.insertBlock + 100 > SmartWeave.block.height
  );
  --balances[caller]; // burn 1 koi per registration
  state.preRegisterDatas.push({
    contractId: contractId,
    insertBlock: SmartWeave.block.height,
    content: { [contentType]: contentTxId },
    owner: caller
  });

  return { state };
}
