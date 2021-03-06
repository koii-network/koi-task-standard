// The index.js file handles compiling the pieces of the contract into a single Smartweave contract file.

import submitDistribution from "./submit_distribution";
import audit from "./audit";
import registerExecutableId from "./register_executable_id";

const handlers = [submitDistribution, audit, registerExecutableId];

export async function handle(state, action) {
  const handler = handlers.find((fn) => fn.name === action.input.function);
  if (handler) return await handler(state, action);
  throw new ContractError(`Invalid function: "${action.input.function}"`);
}
