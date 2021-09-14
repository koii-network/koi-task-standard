export default async function burnKoi(state, action) {
  const balances = state.balances;
  const caller = action.caller;
  const preRegisterDatas = state.preRegisterDatas;
  const input = action.input;
  const contractId = input.contractId;
  const contentType = input.contentType;
  const contentTxId = input.contentTxId;
  const owner = input.owner;

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
