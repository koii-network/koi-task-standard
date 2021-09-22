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
  const nfts = Object.key(nfts);
  await Promise.allSettled(
    preRegisterNfts.map(async (nft) => {
      const txInfo = await SmartWeave.unsafeClient.transactions.get(
        nft.content.nft
      );
      const contractSrcTag = txInfo.tags.find((tag) => tag.name === tagNameB64);
      const owners = {};
      if (
        validContractSrc.includes(contractSrcTag.value) &&
        !nfts.includes(nft.content.nft)
      ) {
        const nftState = await SmartWeave.contracts.readContractState(nft);
        for (let address in nftState.balances) {
          owners[address] = nftState.balances[address];
        }
        nfts[nft.content.nft] = owners;
      }
    })
  );

  return { state };
}
