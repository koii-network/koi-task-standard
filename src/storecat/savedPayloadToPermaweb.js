export default async function savedPayloadToPermaweb(state, action) {
  const tasks = state.tasks;
  const input = action.input;
  const matchIndex = input.matchIndex;
  const txId = input.txId;
  
  // call interactWrite func update task
  if(typeof matchIndex !== 'number') {
    throw new ContractError("Task index should be a number");
  }
  if (typeof txId !== "string")
    throw new ContractError("Invalid input format");
  if (txId.length !== 43)
    throw new ContractError("TransactionId should have 43 characters");

  const task = tasks[matchIndex];
  task.tId = txId;
  task.hasUploaded = true;
  return { state };
}