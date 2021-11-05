/* eslint-disable no-undef */
// The index.js file handles compiling the pieces of the contract into a single Smartweave contract file.
import rank from "./rank";
import addScrapingRequest from "./addTask";
import savePayload from "./savePayload";

const handlers = [rank, addScrapingRequest, savePayload];

export async function handle(state, action) {
  const handler = handlers.find((fn) => fn.name === action.input.function);
  if (handler) return await handler(state, action);
  throw new ContractError(`Invalid function: "${action.input.function}"`);
}
