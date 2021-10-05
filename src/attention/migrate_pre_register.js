export default async function migratePreRegister(state) {
  const mainContactId = state.koiiContract;
  const validContractSrc = state.validContractSrcsB64;
  const contractId = SmartWeave.contract.id;
  const tagNameB64 = "Q29udHJhY3QtU3Jj"; // "Contract-Src" encoded as b64
  const contractState = await SmartWeave.contracts.readContractState(
    mainContactId
  );
  const preRegisterDatas = contractState.preRegisterDatas;
  const preRegisterNfts = preRegisterDatas.filter(
    (preRegisterNft) =>
      "nft" in preRegisterNft.content &&
      preRegisterNft.contractId === contractId
  );
  const nfts = Object.keys(state.nfts);
  const nonMigratedNfts = preRegisterNfts.filter(
    (nft) => !nfts.includes(nft.content.nft)
  );
  //deduplicate nftIds
  const nftIds = [];
  nonMigratedNfts.map((nft) => {
    nftIds.push(nft.content.nft);
  });
  const uniqueNfts = [...new Set(nftIds)];
  await Promise.allSettled(
    uniqueNfts.map(async (nft) => {
      const txInfo = await SmartWeave.unsafeClient.transactions.get(nft);
      const contractSrcTag = txInfo.tags.find((tag) => tag.name === tagNameB64);
      const owners = {};
      if (validContractSrc.includes(contractSrcTag.value)) {
        const nftState = await SmartWeave.contracts.readContractState(nft);
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
    })
  );

  return { state };
}
