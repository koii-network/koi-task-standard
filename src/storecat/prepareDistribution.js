export default async function prepareDistribution(state) {
  const tasks = state.tasks;

  let task = {};
  let block = SmartWeave.block.height;

  for (let index = 0; index < tasks.length; index++) {
    const element = tasks[index];
    if (block >= task.close && task.hasAudit) {
      task = element;
      break;
    }
  }

  if(task.open !== undefined) {
    const prepareDistribution = task.prepareDistribution;

  }
  // tasks.some((t, index) => {
  //   if (block >= task.close && task.hasAudit) {
  //     findIndex = index;
  //     return true;
  //   }
  // })
  // if(findIndex > -1)
  //   task = state.tasks[findIndex];
  // else {
  //   throw new ContractError("There is no task to audit");
  // }
  return { state };
}
