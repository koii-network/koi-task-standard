export default async function savePayload(state, action) {
  const tasks = state.tasks;
  const input = action.input;
  const matchIndex = input.matchIndex;
  const payload = input.payload;
  
  if(typeof matchIndex !== 'number') {
    throw new ContractError("Task index should be a number");
  }

  if(typeof payload !== 'object') {
    throw new ContractError("Payload should be an object");
  }

  tasks[matchIndex].payloads.push({
    hashPayload: payload.hashPayload,
    owner: payload.owner
  });
  for (let index = 0; index < tasks[matchIndex].payloadHashs.length; index++) {
    const element = tasks[matchIndex].payloadHashs[index];
    if(element.hashPayload === payload.hashPayload) {
      console.log("here")
    }
  }
  tasks[matchIndex].payloadHashs.push({
    payload: payload.payload,
    hashPayload: payload.hashPayload,
  });
  // remove task body
  tasks.splice(matchIndex, 1);
  return { state };
}