export default async function burnKoi(state, action) {
  const balances = state.balances;
  const caller = action.caller;
  const preRegisterDatas = state.preRegisterDatas;
  const input = action.input;
  const contractId = input.contractId;
  const contentType = input.contentType;
  const contentTxId = input.contentTxId;
  const owner = input.owner;
  if (!contractId) throw new ContractError("Contract id not specified");
  if (!contentType) throw new ContractError("Content type not specified");
  if (!contentTxId) throw new ContractError("No txId specified");
  if (typeof contractId !== "string" || typeof contentTxId !== "string") {
    throw new ContractError("Invalid inputs");
  }

  if (!(caller in balances) || balances[caller] < 1)
    throw new ContractError("you do not have enough koi");
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
