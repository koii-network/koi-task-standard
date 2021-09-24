export default async function burnKoi(state, action) {
  const balances = state.balances;
  const caller = action.caller;
  const preRegisterDatas = state.preRegisterDatas;
  const input = action.input;
  const contractId = input.contractId;
  const contentType = input.contentType;
  const contentTxId = input.contentTxId;
  const owner = input.owner;
  if (!contractId || !contentType || !contentTxId)
    throw new ContractError("Invalid inputs");
  if (typeof contractId !== "string" || typeof contentTxId !== "string") {
    throw new ContractError("Invalid inputs format");
  }
  if (contractId.length !== 43 || contentTxId.length !== 43) {
    throw new ContractError("Inputs should have 43 characters");
  }
  if (!(caller in balances) || balances[caller] < 1)
    throw new ContractError("you do not have enough koi");
  const data = preRegisterDatas.find(
    (preRegisterData) =>
      preRegisterData.content[contentType] === contentTxId &&
      preRegisterData.contractId === contractId
  );
  if (data !== undefined) {
    throw new ContractError("Content is already registered");
  }
  --balances[caller]; // burn 1 koi per registration
  owner !== undefined
    ? preRegisterDatas.push({
        contractId: contractId,
        insertBlock: SmartWeave.block.height,
        content: { [contentType]: contentTxId },
        owner: owner
      })
    : preRegisterDatas.push({
        contractId: contractId,
        insertBlock: SmartWeave.block.height,
        content: { [contentType]: contentTxId },
        owner: caller
      });

  return { state };
}
