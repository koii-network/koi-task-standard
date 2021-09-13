export default function withdraw(state, action) {
  const balances = state.balances;
  const stakes = state.stakes;
  const caller = action.caller;
  const input = action.input;
  let qty = input.qty;
  if (!(caller in stakes)) {
    throw new ContractError(`This ${caller}adress hasn't staked`);
  }
  if (!Number.isInteger(qty)) {
    throw new ContractError('Invalid value for "qty". Must be an integer');
  }

  if (qty <= 0) throw new ContractError("Invalid stake withdrawal amount");

  const callerStake = stakes[caller];

  const avaliableTokenToWithDraw = callerStake.filter(
    (stake) => SmartWeave.block.height > stake.block + 10080
  );
  const total = avaliableTokenToWithDraw.reduce(
    (acc, curVal) => acc + curVal.value,
    0
  );
  if (qty > total) {
    throw new ContractError("Stake is not ready to be released");
  }
  // If Stake is 14 days old can be withdraw
  for (let stake of avaliableTokenToWithDraw) {
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
