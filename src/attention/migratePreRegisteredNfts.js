export default async function migratePreRegisteredNfts(state, action) {
  const input = action.input;
  const contractId = input.contractId;
  const registeredRecords = state.registeredRecords;
  const MAIN_CONTRACT = "lUzDoS27l3-27mG2zUqi7p3filCvDL6PAcLdicsz8aQ";
  const contractState = await SmartWeave.contracts.readContractState(
    MAIN_CONTRACT
  );
  const preRegisterDatas = contractState.preRegisterDatas;
  const preRegisterNfts = preRegisterDatas.filter(
    (preRegisterNft) =>
      "nftId" in preRegisterNft.content &&
      preRegisterNft.contractId === contractId
  );
  preRegisterNfts.map((preRegisterNft) => {
    if (preRegisterNft.content.nftId in registeredRecords) {
      throw new ContractError(
        `${preRegisterNft.content.nftId} is already registered`
      );
    }
    registeredRecords[preRegisterNft.content.nftId] = preRegisterNft.owner;
  });
  return { state };
}
