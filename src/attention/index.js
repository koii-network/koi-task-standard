import submitDistribution from "./submit_distribution";
import audit from "./audit";
import rankPrepDistribution from "./rank";
import batch from "./batchAction";
import proposeSlash from "./propose_slash";
import registerBundler from "./register_bundler";
import registerExecutableId from "./register_executable_id";
import migratePreRegister from "./migrate_pre_register";
const handlers = [
  submitDistribution,
  audit,
  rankPrepDistribution,
  batch,
  proposeSlash,
  registerBundler,
  registerExecutableId,
  migratePreRegister
];

export async function handle(state, action) {
  const handler = handlers.find((fn) => fn.name === action.input.function);
  if (handler) return await handler(state, action);
  throw new ContractError(`Invalid function: "${action.input.function}"`);
}
