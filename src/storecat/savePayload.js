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

  let isFounded = false;
  const isExist = tasks[matchIndex].hashPayloads.findIndex( h => h.hashPayload === payload.hashPayload);
  if (isExist < 0) {
    tasks[matchIndex].hashPayloads.push({
      hashPayload: payload.hashPayload,
      count: 1
    });
  }
  for (let index = 0; index < tasks[matchIndex].hashPayloads.length; index++) {
    const element = tasks[matchIndex].hashPayloads[index];
    if (element.hashPayload === payload.hashPayload) {
      isFounded = true;
      tasks[matchIndex].payloads[index].count++;
    }
  }
  tasks[matchIndex].payloads.push({
    owner: payload.owner,
    payloadTxId: payload.payloadTxId,
    hashPayload: payload.hashPayload,
    count: 1
  });
  return { state };
}
