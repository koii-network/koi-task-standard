export default async function register(state, action) {
  const input = action.input;
  const caller = action.caller;
  const owner = state.owner;
  if (owner !== caller) {
    throw new ContractError("Only the owner can register");
  }
  const nftId = input.nftId;
  if (!nftId) throw new ContractError("nftId is undefined");
  const contractState = await SmartWeave.contracts.readContractState(nftId);

  if (contractState.balances[caller] !== 1) {
    throw new ContractError(
      `token needs to be locked first.delegate your nft to this address ${state.owner}`
    );
  }

  const nftIdOnOtherNetwork = input.nftIdOnOtherNetwork;
  if (!nftIdOnOtherNetwork)
    throw new ContractError("nftIdOnOtherNetwork is undefined");
  const network = input.network;
  if (!network) throw new ContractError("network is undefined");
  if (network === "ethereum") {
    const registry = state.registry;
    if (registry.ethereum !== undefined) {
      registry.ethereum[nftId] = nftIdOnOtherNetwork;
    } else {
      registry[network] = { [nftId]: nftIdOnOtherNetwork };
    }
  } else {
    throw new ContractError("network is not supported");
  }
  return { state };
}
