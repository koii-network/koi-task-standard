export default function registerExecutableId(state, action) {
  const input = action.input;
  const ExecutableId = input.ExecutableFile;
  state.ExecutableId = ExecutableId;
  return { state };
}
