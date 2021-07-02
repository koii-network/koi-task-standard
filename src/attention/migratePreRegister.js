export default async function migratePreRegisterNfts(state, action) {
  const registeredRecords = state.registeredRecords;
  const MAIN_CONTRACT = "e9raEJJacDDCWqOshtfXaxjiXfeEfRvTj34eq4GqzVQ";
  const contractState = await SmartWeave.contracts.readContractState(
    MAIN_CONTRACT
  );
  const preRegisterDatas = contractState.preRegisterDatas;
  const preRegisterNfts = preRegisterDatas.filter(
    (preRegisterNft) => "nftId" in preRegisterNft.content
  );
  preRegisterNfts.map((preRegisterNft) => {
    registeredRecords[preRegisterNft.content.nftId] = preRegisterNft.owner;
  });
}
