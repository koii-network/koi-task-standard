export default function unregister(state, action) {
  const input = action.input;
  const caller = action.caller;
  const registry = state.registry;
  const nftIdOtherNetwork = input.nftIdOtherNetwork;
  const network = input.network;
  ContractAssert(caller === state.owner, `Owner only can unregister`);
  ContractAssert(nftIdOtherNetwork, `No NFT Id specified.`);
  ContractAssert(network, `Network is not specified.`);
  const nftIdArweave = Object.keys(registry[network]).find(
    (key) => registry[network][key] === nftIdOtherNetwork
  );
  delete registry[network][nftIdArweave];
  return { state };
}
