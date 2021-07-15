import submitDistribution from "./submit_distribution";
import auditPropose from "./audit";
import rank from "./rank";
import vote from "./vote";
const handlers = [submitDistribution, auditPropose, rank, vote];

export async function handle(state, action) {
  const handler = handlers.find((fn) => fn.name === action.input.function);
  if (handler) return await handler(state, action);
  throw new ContractError(`Invalid function: "${action.input.function}"`);
}
