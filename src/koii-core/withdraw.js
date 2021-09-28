export default function withdraw(state, action) {
  const balances = state.balances;
  const stakes = state.stakes;
  const caller = action.caller;
  const input = action.input;
  let qty = input.qty;
  if (!qty) throw new ContractError("Invalid input");
  if (typeof qty !== "number" || qty <= 0)
    throw new ContractError("Invalid input format");
  if (!(caller in stakes))
    throw new ContractError(`This ${caller}adress hasn't staked`);
  const callerStake = stakes[caller];
  const avaliableTokenToWithdraw = callerStake.filter(
    (stake) => SmartWeave.block.height > stake.block + 10080
  );
  const total = avaliableTokenToWithdraw.reduce(
    (acc, curVal) => acc + curVal.value,
    0
  );
  if (qty > total) throw new ContractError("Stake is not ready to be released");

  // If Stake is 14 days old,  Can be withdraw
  for (let stake of avaliableTokenToWithdraw) {
    if (qty <= stake.value) {
      stake.value -= qty;
      balances[caller] += qty;
      break;
    }
    if (qty > stake.value) {
      balances[caller] += stake.value;
      qty -= stake.value;
      stake.value -= stake.value;
    }
  }

  return { state };
}
