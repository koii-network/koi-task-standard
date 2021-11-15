export default function lockBounty(state, action) {
  const balances = state.balances;
  const input = action.input;
  const caller = action.caller;
  const contractId = input.contractId;
  const bounty = input.bounty;
  if (!bounty || !contractId) throw new ContractError("Invalid inputs");
  if (typeof taskId !== "string" || typeof bounty !== "number") {
    throw new ContractError("Invalid inputs format");
  }
  if (contractId.length !== 43) {
    throw new ContractError("Inputs should have 43 characters");
  }
  const contractTask = state.tasks.find((task) => task.txId === contractId);
  if (!contractTask) throw new ContractError("contract not found");
  if (!(caller in balances) || balances[caller] < bounty)
    throw new ContractError("You do not have enough koi");
  balances[caller] -= bounty;
  contractTask.lockedBounty[SmartWeave.transaction.id] = { caller: bounty };
  return { state };
}
