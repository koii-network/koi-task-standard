import batchAction from "./batch_action";
import deregisterData from "./deregister_data";
import distributeRewards from "./distribute_rewards";
import gateway from "./gateway";
import proposeSlash from "./propose_slash";
import rankProposal from "./rank_proposal";
import registerBatchData from "./register_batch_data";
import registerData from "./register_data";
import submitTrafficLog from "./submit_traffic_log";
import vote from "./vote";

export async function handle(state, action) {
  const handlers = [
    batchAction,
    deregisterData,
    distributeRewards,
    gateway,
    proposeSlash,
    rankProposal,
    registerBatchData,
    registerData,
    submitTrafficLog,
    vote
  ];

  const handler = handlers.find((fn) => fn.name === action.input.function);
  if (handler) return await handler(state, action);
  throw new ContractError(`Invalid function: "${action.input.function}"`);
}
