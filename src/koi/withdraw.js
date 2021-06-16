export default function withdraw(state, action) {
  const balances = state.balances;
  const stakes = state.stakes;
  const stakeReleaseBlock = state.stakeReleaseBlock;
  const caller = action.caller;
  const input = action.input;
  const qty = input.qty;

  if (qty <= 0) throw new ContractError("Invalid stake withdrawal amount");
  if (!Number.isInteger(qty))
    throw new ContractError('Invalid value for "qty". Must be an integer');
  if (stakes[caller] < qty)
    throw new ContractError(
      "Stake balance is too low to withdraw that amount of tokens"
    );
  if (stakeReleaseBlock[caller] < SmartWeave.block.height) {
    throw new ContractError("Stake is not ready to be released");
  }

  stakes[caller] -= qty;
  balances[caller] += qty;

  return { state };
}
