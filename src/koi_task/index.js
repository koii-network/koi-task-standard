import submitPayload from "./submit_payload";
import registerNode from "./register_node";
import deRegisterNode from "./retire_node";

const handlers = [submitPayload, registerNode, deRegisterNode];

export async function handle(state, action) {
  const handler = handlers.find((fn) => fn.name === action.input.function);
  if (handler) return await handler(state, action);
  throw new ContractError(`Invalid function: "${action.input.function}"`);
}
