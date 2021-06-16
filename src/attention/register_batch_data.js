export default async function registerBatchData(state, action) {
  const registeredRecords = state.registeredRecord;
  const caller = action.caller;
  const input = action.input;
  const txIds = input.txIds;
  const ownerWallet = input.owner;

  if (!txIds) throw new ContractError("No txids specified");
  const MAIN_CONTRACT = "Bq6dib6GLqe-rFspNXqmIbZspMNchdPAjTPKV6-vwNE";
  const tokenContractState = await SmartWeave.contracts.readContractState(
    MAIN_CONTRACT
  );
  const balances = tokenContractState.balances;
  if (!(caller in balances) || balances[caller] < 1)
    throw new ContractError("you need min 1 KOI to register data");
  const notRegisteredTxIds = [];
  for (const txId of txIds) {
    if (!(txId in registeredRecords)) notRegisteredTxIds.push(txId);
    else {
      throw new ContractError(
        `Transaction/content has been registered already under ${registeredRecords[txId]} wallet`
      );
    }
  }

  const owner = ownerWallet || caller;
  for (const txId of notRegisteredTxIds) {
    registeredRecords[txId] = owner;
    balances[caller] -= 1; // burn 1 koi per registeration
  }

  return { state };
}
