export default async function registerBundler(state, action) {
  const validBundlers = state.validBundlers;
  const blackList = state.blackList;
  const caller = action.caller;
  const mainContactId = action.input.contractId;
  if (validBundlers.includes(caller))
    throw new ContractError(`${caller} is already registered`);
  if (blackList.includes(caller)) {
    throw new ContractError(`${caller}address is in blacklist`);
  }
  const tokenContractState = await SmartWeave.contracts.readContractState(
    mainContactId
  );
  const stakes = tokenContractState.stakes;
  if (!(caller in stakes) || stakes[caller] < 1000) {
    throw new Contract(
      "You should stake minimum 1000 stake to register as valid bundler"
    );
  }
  validBundlers.push(caller);
  return { state };
}
