export default async function migratePreRegister(state) {
  const mainContactId = state.koiiContract;
  const validContractSrc = state.validContractSrcsB64;
  const contractId = SmartWeave.contract.id;
  const tagNameB64 = "Q29udHJhY3QtU3Jj"; // "Contract-Src" encoded as b64
  const contractState = await SmartWeave.contracts.readContractState(
    mainContactId
  );
  const nfts = Object.keys(state.nfts);
  const newNfts = [];
  for (const data of contractState.preRegisterDatas) {
    if (
      "content" in data &&
      "nft" in data.content &&
      data.contractId === contractId &&
      !nfts.includes(data.content.nft) &&
      !newNfts.includes(data.content.nft)
    )
      newNfts.push(data.content.nft);
  }
  await Promise.allSettled(
    newNfts.map(async (nft) => {
      const txInfo = await SmartWeave.unsafeClient.transactions.get(nft);
      const contractSrcTag = txInfo.tags.find((tag) => tag.name === tagNameB64);
      if (validContractSrc.includes(contractSrcTag.value)) {
        const nftState = await SmartWeave.contracts.readContractState(nft);
        if ("balances" in nftState) {
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
    })
  );

  return { state };
}
