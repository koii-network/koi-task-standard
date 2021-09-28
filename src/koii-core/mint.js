export default function mint(state, action) {
  const owner = state.owner;
  const balances = state.balances;
  const caller = action.caller;
  const input = action.input;
  const target = input.target;
  const qty = input.qty;

  if (owner !== caller)
    throw new ContractError("Only the owner can mint new tokens");
  if (!target || !qty) throw new ContractError("Invalid Inputs");
  if (typeof target !== "string" || typeof qty !== "number" || qty <= 0)
    throw new ContractError("Invalid input format");
  if (target.length !== 43 || target.indexOf(" ") >= 0) {
    throw new ContractError("Address should have 43 characters and no space");
  }

  if (balances[target]) balances[target] += qty;
  else balances[target] = qty;

  return { state };
}
