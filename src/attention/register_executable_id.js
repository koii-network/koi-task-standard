export default function registerExecutableId(state, action) {
  const input = action.input;
  const caller = action.caller;
  const executableId = input.executableId;
  const owner = state.owner;
  if (caller !== owner) {
    throw new ContractError("Only owner can register");
  }
  state.executableId = executableId;
  return { state };
}
