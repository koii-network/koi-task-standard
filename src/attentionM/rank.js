export default function rank(state, action) {
  const votes = state.votes;
  const task = state.task;
  const currentProposed = task.dailyProposedDistribution.find(
    (proposedData) => proposedData.block === task.open
  );
  const proposeDatas = currentProposed.proposedDistribution;

  proposeDatas.map((proposeData) => {
    for (let vote of votes) {
      if (vote.id === proposeData.id && vote.yays > vote.nays) {
        proposeData.status = "rejected";
      } else {
        proposeData.status = "accepted";
      }
    }
  });
  currentProposed.isRanked = true;
  return { state };
}
