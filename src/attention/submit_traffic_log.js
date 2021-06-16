export default async function submitTrafficLog(state, action) {
  const trafficLogs = state.trafficLogs;
  const caller = action.caller;
  const input = action.input;
  const batchTxId = input.batchTxId;
  const gateWayUrl = input.gateWayUrl;
  const stakeAmount = input.stakeAmount;
  const participatesRates = trafficLogs.participatesRates;
  if (!batchTxId) {
    throw new ContractError("No batchTxId specified");
  }
  if (!gateWayUrl) {
    throw new ContractError("No gateWayUrl specified");
  }
  const MAIN_CONTRACT = "Bq6dib6GLqe-rFspNXqmIbZspMNchdPAjTPKV6-vwNE";
  const tokenContractState = await SmartWeave.contracts.readContractState(
    MAIN_CONTRACT
  );
  const balances = tokenContractState.balances;
  if (!(caller in balances) || balances[caller] < 1) {
    throw new ContractError("you need min 1 KOI to propose gateway");
  }
  // if (SmartWeave.block.height > trafficLogs.close - 420) {
  //   throw new ContractError("proposing is closed. wait for another round");
  // }

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
    end: trafficLogs.close
  };

  const proposedLog = {
    TLTxId: batchTxId,
    owner: caller,
    gateWayId: gateWayUrl,
    voteId: state.votes.length,
    blockHeight: SmartWeave.block.height,
    won: false
  };

  const currentDailyTrafficLogs =
    trafficLogs.dailyTrafficLog[trafficLogs.dailyTrafficLog.length - 1];
  currentDailyTrafficLogs.proposedLogs.push(proposedLog);
  state.votes.push(vote);
  // balances[caller] -= 1;
  if (!(caller in participatesRates)) participatesRates[caller] = 0;
  else participatesRates[caller]++;

  return { state };
}
