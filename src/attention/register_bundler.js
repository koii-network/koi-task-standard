export default async function registerBundler(state, action) {
  const validBundlers = state.validBundlers;
  const blackList = state.blackList;
  const mainContractId = state.koiiContract;
  const caller = action.caller;
  if (validBundlers.includes(caller))
    throw new ContractError(`${caller} is already registered`);
  if (blackList.includes(caller)) {
    throw new ContractError(`${caller}address is in blacklist`);
  }
  const tokenContractState = await SmartWeave.contracts.readContractState(
    mainContractId
  );
  const stakes = tokenContractState.stakes;
  if (!(caller in stakes) || stakes[caller] < 10) {
    throw new Contract(
      "You should stake minimum 10 stake to register as valid bundler"
    );
  }
  validBundlers.push(caller);
  return { state };
}
