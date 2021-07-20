import transfer from "./transfer";
import balance from "./balance";
import lock from "./lock";
import unlock from "./unlock";
import checkDecay from "./checkDecay";

const handlers = [transfer, balance, lock, unlock, checkDecay];

export async function handle(state, action) {
  const handler = handlers.find((fn) => fn.name === action.input.function);
  if (handler) return await handler(state, action);
  throw new ContractError(`Invalid function: "${action.input.function}"`);
}
