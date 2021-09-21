// The index.js file handles compiling the pieces of the contract into a single Smartweave contract file.

import submitDistribution from "./submit_distribution";
import audit from "./audit";
import rankPrepDistribution from "./rank";
import batchAction from "./batchAction";
import proposeSlash from "./propose_slash";
import registerExecutableId from "./register_executable_id";
import migratePreRegister from "./migrate_pre_register";
const handlers = [
  submitDistribution,
  audit,
  rankPrepDistribution,
  batchAction,
  proposeSlash,
  registerExecutableId,
  migratePreRegister
];

export async function handle(state, action) {
  const handler = handlers.find((fn) => fn.name === action.input.function);
  if (handler) return await handler(state, action);
  throw new ContractError(`Invalid function: "${action.input.function}"`);
}
