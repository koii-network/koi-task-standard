export default async function prepareDistribution(state) {
  const tasks = state.tasks;

  let matchIndex = -1;
  for (let index = 0; index < tasks.length; index++) {
    const element = tasks[index];
    if (block >= element.close && !element.hasAudit && element.payloads.length > 0) {
      matchIndex = index;
      break;
    }
  }
  if(matchIndex === -1)
    throw new ContractError("There is no task to audit");
  }
  const task = tasks[matchIndex];
  if(task.hasOwnProperty('open')) {
    // calc top hash and prepare balance
  }
  return { state };
}
