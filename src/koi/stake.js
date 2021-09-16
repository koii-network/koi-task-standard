export default function stake(state, action) {
  const balances = state.balances;
  const stakes = state.stakes;
  const caller = action.caller;
  const input = action.input;
  const qty = input.qty;
  if (isNaN(qty) || qty <= 0) throw new ContractError("Invalid input");
  if (balances[caller] < qty) {
    throw new ContractError(
      "Balance is too low to stake that amount of tokens"
    );
  }
  balances[caller] -= qty;

  caller in stakes
    ? stakes[caller].push({ value: qty, block: SmartWeave.block.height })
    : (stakes[caller] = [{ value: qty, block: SmartWeave.block.height }]);
  return { state };
}
