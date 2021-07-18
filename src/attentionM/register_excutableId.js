export default function registerExecutableId(state, action) {
  const input = action.input;
  const executableId = input.executableId;
  state.executableId = executableId;
  return { state };
}
