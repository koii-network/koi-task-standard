export default function transfer(state, action) {
  const balances = state.balances;
  const caller = action.caller;
  const input = action.input;
  const target = input.target;
  const qty = input.qty;

  if (!target || isNaN(qty) || qty <= 0 || caller === target)
    throw new ContractError("Invalid inputs");
  if (typeof target !== "string")
    throw new ContractError("Invalid input format");
  if (target.length !== 43) {
    throw new ContractError("Address should have 43 characters");
  }
  if (balances[caller] < qty) {
    throw new ContractError(
      `Caller balance not high enough to send ${qty} token(s)!`
    );
  }

  balances[caller] -= qty;
  if (target in balances) balances[target] += qty;
  else balances[target] = qty;

  return { state };
}
