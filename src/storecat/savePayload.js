/* eslint-disable no-undef */
export default async function savePayload(state, action) {
  const tasks = state.tasks;
  const input = action.input;
  const matchIndex = input.matchIndex;
  const payload = input.payload;

  if (typeof matchIndex !== "number") {
    throw new ContractError("Task index should be a number");
  }

  if (typeof payload !== "object") {
    throw new ContractError("Payload should be an object");
  }

  // tasks[matchIndex].payloads.push({
  //   hashPayload: payload.hashPayload,
  //   owner: payload.owner
  // });

  let isFounded = false;
  for (let index = 0; index < tasks[matchIndex].payloadHashs.length; index++) {
    const element = tasks[matchIndex].payloadHashs[index];
    if (element.hashPayload === payload.hashPayload) {
      isFounded = true;
      tasks[matchIndex].payloadHashs[index].count++;
    }
  }

  if (!isFounded) {
    tasks[matchIndex].payloadHashs.push({
      payloadTxId: payload.payloadTxId,
      hashPayload: payload.hashPayload,
      count: 1
    });
  }
  return { state };
}
