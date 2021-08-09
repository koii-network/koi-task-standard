import submitDistribution from "./submit_distribution";
import audit from "./audit";
import rankAndPrepareDistribution from "./rank";
import batch from "./batchAction";
import proposeSlash from "./propose_slash";
import registerBundler from "./register_bundler";
import registerExecutableId from "./register_excutableId";
import cleanInvalidTransactions from "./clean_invalidTrasanctions";
import migratePreRegister from "./migratePreRegister";
const handlers = [
  submitDistribution,
  audit,
  rankAndPrepareDistribution,
  batch,
  proposeSlash,
  registerBundler,
  registerExecutableId,
  cleanInvalidTransactions,
  migratePreRegister
];

export async function handle(state, action) {
  const handler = handlers.find((fn) => fn.name === action.input.function);
  if (handler) return await handler(state, action);
  throw new ContractError(`Invalid function: "${action.input.function}"`);
}
