export default function submitPayload(state, action) {
  const caller = action.caller;
  const input = action.input;
  const data = input.data;
  const payloads = state.Payloads;
  const submittedData = payloads.find(
    (proposedData) => proposedData.data.price === data.price
  );
  if (submittedData !== undefined) {
    submittedData.submmittedNodes.push(caller);
    state.submmittedNodes = submittedData;
  } else {
    payloads.push({
      TaskFileURL: state.ExecutableFile,
      data: data,
      submmittedNodes: [caller]
    });
  }
  return { state };
}
