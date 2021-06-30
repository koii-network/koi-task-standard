export default function burnKoi(state, action){
  const balances = state.balances;
  const caller = action.caller;
  if (!(caller in balances) || balances[caller] < 1)
    throw new ContractError("you do not have enough koi");
  --balances[caller]; // burn 1 koi per registration
  return { state };
}
