import account from "./account";
import deregisterTask from "./deregister_task";
import distributeRewards from "./distributeReward";
import mint from "./mint";
import registerTask from "./register_task";
import stake from "./stake";
import transfer from "./transfer";
import withdraw from "./withdraw";
import burnKoi from "./burn_koi";
import cleanPreRegister from "./clean_preRegister";

const handlers = [
  account,
  burnKoi,
  deregisterTask,
  distributeRewards,
  mint,
  registerTask,
  stake,
  transfer,
  withdraw,
  cleanPreRegister
];

export async function handle(state, action) {
  const handler = handlers.find((fn) => fn.name === action.input.function);
  if (handler) return await handler(state, action);
  throw new ContractError(`Invalid function: "${action.input.function}"`);
}
