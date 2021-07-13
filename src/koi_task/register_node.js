export default function registerNode(state, action) {
  const input = action.input;
  const caller = action.caller;
  const nodes = input.nodes;
  if (caller == state.owner) {
    throw new ContractError("The owner only have acces to register a node");
  }
  for (let node of nodes) {
    state.nodeList.push(node);
  }
  return { state };
}
