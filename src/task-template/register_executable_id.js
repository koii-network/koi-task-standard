export default function registerExecutableId(state, action) {
  const input = action.input;
  const caller = action.caller;
  const executableId = input.executableId;
  const owner = SmartWeave.contract.owner;
  if (caller !== owner) {
    throw new ContractError("Only owner can register");
  }
  if (!executableId) throw new ContractError("Invalid input");
  if (typeof executableId !== "string")
    throw new ContractError("Invalid input format");
  if (executableId.length !== 43)
    throw new ContractError("Input should have 43 characters");

  state.executableId = executableId;
  return { state };
}
