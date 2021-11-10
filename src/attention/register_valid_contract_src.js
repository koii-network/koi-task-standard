export default function registerValidContractSrc(state, action) {
  const caller = action.caller;
  const input = action.input;
  const contractSrc = input.contractSrc;
  if (caller !== SmartWeave.contract.owner)
    throw new ContractError("Owner only can register valid contract source");
  if (typeof contractSrc !== "string") throw new ContractError("Invalid input");
  if (contractSrc.length !== 43) throw new ContractError("Invalid format");

  if (state.validContractSrcs.includes(contractSrc))
    throw new ContractError("The contract source already registered");
  state.validContractSrcs.push(contractSrc);
  return { state };
}
