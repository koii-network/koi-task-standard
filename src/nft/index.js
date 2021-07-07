export function handle(state, action) {
  const input = action.input;
  const caller = action.caller;

  if (input.function === "transfer") {
    const target = input.target;
    ContractAssert(target, `No target specified.`);
    ContractAssert(caller !== target, `Invalid token transfer.`);
    const qty = input.qty;
    ContractAssert(qty, `No quantity specified.`);
    const balances = state.balances;
    ContractAssert(
      caller in balances && balances[caller] >= qty,
      `Caller has insufficient funds`
    );
    balances[caller] -= qty;
    if (!(target in balances)) {
      balances[target] = 0;
    }
    balances[target] += qty;
    state.balances = balances;
    return { state };
  }
  if (input.function === "balance") {
    let target;
    if (input.target) {
      target = input.target;
    } else {
      target = caller;
    }
    const ticker = state.ticker;
    const balances = state.balances;
    ContractAssert(
      typeof target === "string",
      `Must specify target to retrieve balance for.`
    );
    return {
      result: {
        target,
        ticker,
        balance: target in balances ? balances[target] : 0
      }
    };
  }

  if (input.function === "lock") {
    const delegatedOwner = input.delegatedOwner;
    ContractAssert(delegatedOwner, `No target specified.`);
    const qty = input.qty;
    ContractAssert(qty, `No quantity specified.`);
    const balances = state.balances;
    ContractAssert(
      caller in balances && balances[caller] >= qty,
      `Caller has insufficient funds`
    );
    balances[caller] -= qty;
    if (!(delegatedOwner in balances)) {
      balances[delegatedOwner] = 0;
    }
    balances[delegatedOwner] += qty;

    const ethOwnerAddress = input.ethOwnerAddress;
    ContractAssert(ethOwnerAddress, `No ethereum address specified.`);
    state.ethOwnerAddress = ethOwnerAddress;
    return { state };
  }
  throw new ContractError(
    `No function supplied or function not recognised: "${input.function}".`
  );
}
