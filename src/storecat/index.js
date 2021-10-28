// The index.js file handles compiling the pieces of the contract into a single Smartweave contract file.
import submitDistribution from "./submit_distribution";
import audit from "./audit";
import addScrapingRequest from "./addScrapingRequest";
import savePayload from "./savePayload";
import confirmDistributeReward from "./confirmDistributeReward";
import savedPayloadToPermaweb from "./savedPayloadToPermaweb";
import updateCompletedTask from "./updateCompletedTask";

const handlers = [
  submitDistribution,
  audit,
  addScrapingRequest,
  savePayload,
  confirmDistributeReward,
  savedPayloadToPermaweb,
  updateCompletedTask
];

export async function handle(state, action) {
  const handler = handlers.find((fn) => fn.name === action.input.function);
  if (handler) return await handler(state, action);
  throw new ContractError(`Invalid function: "${action.input.function}"`);
}
