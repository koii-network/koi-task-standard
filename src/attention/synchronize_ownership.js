export default async function syncOwnership(state, action) {
  const caller = action.caller;
  const input = action.input;
  const txId = input.txId;
  if (!txId) throw new ContractError("Invalid inputs");
  if (!Array.isArray(txId) && typeof txId !== "string")
    throw new ContractError("Invalid inputs format");
  if (Array.isArray(txId) && caller !== SmartWeave.contract.owner)
    throw new ContractError("Owner can only update in batch");

  if (Array.isArray(txId)) {
    // filler the nfts registered to avoid reading invalid nft contract
    const validNfts = txId.filter((nft) =>
      Object.keys(state.nfts).includes(nft)
    );
    for (const nft of validNfts) {
      const nftState = await SmartWeave.contracts
        .readContractState(nft)
        .catch((e) => {
          if (e.type !== "TX_NOT_FOUND") throw e;
        });
      if (nftState && "balances" in nftState) {
        const owners = {};
        for (let owner in nftState.balances) {
          if (
            nftState.balances[owner] > 0 &&
            typeof owner === "string" &&
            owner.length === 43 &&
            !(owner.indexOf(" ") >= 0)
          )
            owners[owner] = nftState.balances[owner];
        }
        state.nfts[nft]["owners"] = owners;
      }
    }
  }
  if (typeof txId === "string") {
    if (!Object.keys(state.nfts).includes(txId)) {
      throw new ContractError("Can't update ownership for not registered NFTs");
    }
    const nftState = await SmartWeave.contracts
      .readContractState(txId)
      .catch((e) => {
        if (e.type !== "TX_NOT_FOUND") throw e;
      });
    if (nftState && "balances" in nftState) {
      const owners = {};
      for (let owner in nftState.balances) {
        if (
          nftState.balances[owner] > 0 &&
          typeof owner === "string" &&
          owner.length === 43 &&
          !(owner.indexOf(" ") >= 0)
        )
          owners[owner] = nftState.balances[owner];
      }
      state.nfts[txId]["owners"] = owners;
    }
  }
  return { state };
}
