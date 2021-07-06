export default async function submitPayload(state, action) {
  const task = state.task;
  const caller = action.caller;
  const input = action.input;
  const batchTxId = input.batchTxId;
  const gateWayUrl = input.gateWayUrl;
  const stakeAmount = input.stakeAmount;
  if (!batchTxId) throw new ContractError("No batchTxId specified");
  if (!gateWayUrl) throw new ContractError("No gateWayUrl specified");
  const currentTask = task.dailyPayload[task.dailyPayload.length - 1];
  const gatewayProposed = currentTask.payloads.find(
    (payload) => payload.gateWayId === gateWayUrl
  );
  if (gatewayProposed !== undefined) {
    throw new ContractError(
      `Logs are already proposed from ${gateWayUrl} gateWay`
    );
  }
  const MAIN_CONTRACT = "Qa9SzAuwJR6xZp3UiKzokKEoRnt_utJKjFjTaSR85Xw";
  const tokenContractState = await SmartWeave.contracts.readContractState(
    MAIN_CONTRACT
  );
  const koi_tasks = tokenContractState.KOI_TASKS;
  const attentionTask = koi_tasks.find(
    (task) => task.TaskName === "AttentionGame"
  );
  for (let rewardedBlock of attentionTask.TrafficBlockRewarded) {
    const rewardDistributionReport = task.rewardReport.find(
      (distributionReport) =>
        distributionReport.dailyTrafficBlock === rewardedBlock
    );
    if (rewardDistributionReport !== undefined) {
      rewardDistributionReport.distributed = true;
    }
  }

  // if (SmartWeave.block.height > task.close - 420)
  //   throw new ContractError("proposing is closed. wait for another round");
  const vote = {
    id: state.votes.length,
    type: "trafficLogs",
    status: "active",
    voted: [],
    stakeAmount: stakeAmount,
    yays: 0,
    nays: 0,
    bundlers: {},
    start: SmartWeave.block.height,
    end: task.close
  };
  const payload = {
    TLTxId: batchTxId,
    owner: caller,
    gateWayId: gateWayUrl,
    voteId: state.votes.length,
    blockHeight: SmartWeave.block.height,
    won: false
  };
  currentTask.payloads.push(payload);
  state.votes.push(vote);
  return { state };
}
