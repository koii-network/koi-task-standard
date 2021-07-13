export default function deRegisterNode(state, action) {
  const caller = action.caller;
  const input = action.caller;
  const nodes = input.nodes;
  if (caller !== state.owner) {
    throw new ContractError("The Owner only have access to deregister a node");
  }
  if (nodeList) {
    for (let node of nodes) {
      let newlist = state.nodeList.filter((nodeReg) => nodeReg !== node);
      state.nodeList = newlist;
    }
  } else {
    throw new ContractError("You haven't Registered Nodes");
  }

  return { state };
}
