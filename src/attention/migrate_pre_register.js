export default async function migratePreRegister(state) {
  const nfts = state.nfts;
  const mainContactId = state.koiiContract;
  const contractId = SmartWeave.contract.id;
  const contractState = await SmartWeave.contracts.readContractState(
    mainContactId
  );
  const preRegisterDatas = contractState.preRegisterDatas;
  const preRegisterNfts = preRegisterDatas.filter(
    (preRegisterNft) =>
      "nft" in preRegisterNft.content &&
      preRegisterNft.contractId === contractId
  );
  const registeredNfts = Object.values(nfts).reduce(
    (acc, curVal) => acc.concat(curVal),
    []
  );

  for (let i = 0; i < preRegisterNfts.length; i++) {
    if (!registeredNfts.includes(preRegisterNfts[i].content.nft)) {
      if (preRegisterNfts[i].owner in nfts) {
        {
          nfts[preRegisterNfts[i].owner].push(preRegisterNfts[i].content.nft);
        }
      } else {
        nfts[preRegisterNfts[i].owner] = [preRegisterNfts[i].content.nft];
      }
    }
  }

  return { state };
}
