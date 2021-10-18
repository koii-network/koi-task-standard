export default async function prepareDistribution(state) {
  const votes = state.votes;
  const task = state.task;
  const blacklist = state.blacklist;
  const prepareDistribution = task.prepareDistribution;
  
  return { state };
}
