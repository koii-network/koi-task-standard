export default function registerValidContractSrc(state, action) {
  const caller = action.caller;
  const input = action.input;
  const contractSrc = input.contractSrc;
  if (caller !== state.owner)
    throw new ContractError("Owner only can register valid contract source");
  if (contractSrc !== "string") throw new ContractError("Invalid input");
  if (contractSrc.length !== 43) throw new ContractError("Invalid format");

  const encodeContractSrc =
    SmartWeave.arweave.utils.stringToB64Url(contractSrc);
  if (state.validContractSrcsB64.includes(encodeContractSrc))
    throw new ContractError("The contract source already registered");
  state.validContractSrcsB64.push(encodeContractSrc);
  return { state };
}
