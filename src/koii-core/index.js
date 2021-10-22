import deregisterTask from "./deregister_task";
import distributeReward from "./distribute_reward";
import mint from "./mint";
import registerTask from "./register_task";
import stake from "./stake";
import transfer from "./transfer";
import withdraw from "./withdraw";
import burnKoi from "./burn_koi";
import freeze from "./freeze";

const handlers = [
  burnKoi,
  deregisterTask,
  distributeReward,
  freeze,
  mint,
  registerTask,
  stake,
  transfer,
  withdraw
];

export async function handle(state, action) {
  if (state.frozen) throw new ContractError("Contract frozen");
  const handler = handlers.find((fn) => fn.name === action.input.function);
  if (handler) return await handler(state, action);
  throw new ContractError(`Invalid function: "${action.input.function}"`);
}
