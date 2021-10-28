export default function freeze(state, action) {
  const caller = action.caller;
  const input = action.input;
  const freeze = input.freeze;
  if (caller !== SmartWeave.contract.owner)
    throw new ContractError("Caller is not owner");
  if (typeof freeze !== "boolean") throw new ContractError("Invaild input");
  state.freeze = freeze;
  return { state };
}
