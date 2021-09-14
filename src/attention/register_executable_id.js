export default function registerExecutableId(state, action) {
  const input = action.input;
  const caller = action.caller;
  const executableId = input.executableId;
  const owner = state.owner;
  if (!executableId) throw new ContractError("Executable id not specified");
  if (typeof executableId !== "string")
    throw new ContractError("executableId should be string");
  if (caller !== owner) {
    throw new ContractError("Only owner can register");
  }
  state.executableId = executableId;
  return { state };
}
