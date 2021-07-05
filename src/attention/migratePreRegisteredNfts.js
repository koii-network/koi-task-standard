export default async function migratePreRegisteredNfts(state, action) {
  const registeredRecords = state.registeredRecords;
  const MAIN_CONTRACT = "apWEeknIubej-YF_f5E0uC28cUv3nn6E92yubWByk5g";
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
