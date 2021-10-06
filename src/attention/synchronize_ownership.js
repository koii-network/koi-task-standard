export default async function syncOwnership(state, action) {
  const caller = action.caller;
  const input = action.input;
  const validContractSrc = state.validContractSrcsB64;
  const txId = input.txId;
  if (!txId) throw new ContractError("Invalid inputs");
  if (!Array.isArray(txId) && typeof txId !== "string")
    throw new ContractError("Invalid inputs format");
  if (Array.isArray(txId) && caller !== state.owner)
    throw new ContractError("Owner can only update in batch");

  if (Array.isArray(txId)) {
    // filler the nfts registered only to avoid reading invalid nft contract
    const validNfts = txId.filter((nft) =>
      Object.keys(state.nfts).includes(nft)
    );
    for (const nft of validNfts) {
      const nftState = await SmartWeave.contracts
        .readContractState(nft)
        .catch((e) => {
          if (e.type !== "TX_NOT_FOUND") throw e;
        });
      if (nftState) {
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
        state.nfts[nft] = owners;
      }
    }
  }
  if (typeof txId === "string") {
    const tagNameB64 = "Q29udHJhY3QtU3Jj"; // "Contract-Src" encoded as b64
    const txInfo = await SmartWeave.unsafeClient.transactions.get(txId);
    const contractSrcTag = txInfo.tags.find((tag) => tag.name === tagNameB64);
    if (validContractSrc.includes(contractSrcTag.value)) {
      const owners = {};
      const nftState = await SmartWeave.contracts.readContractState(txId);
      for (let owner in nftState.balances) {
        if (
          nftState.balances[owner] > 0 &&
          typeof owner === "string" &&
          owner.length === 43 &&
          !(owner.indexOf(" ") >= 0)
        )
          owners[owner] = nftState.balances[owner];
      }
      state.nfts[txId] = owners;
    }
  }
  return { state };
}
