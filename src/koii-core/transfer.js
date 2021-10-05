export default function transfer(state, action) {
  const balances = state.balances;
  const caller = action.caller;
  const input = action.input;
  const target = input.target;
  const qty = input.qty;

  if (!target || !qty || caller === target)
    throw new ContractError("Invalid inputs");
  if (typeof target !== "string" || typeof qty !== "number" || qty <= 0)
    throw new ContractError("Invalid input format");
  if (target.length !== 43 || target.indexOf(" ") >= 0) {
    throw new ContractError("Address should have 43 characters and no space");
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
