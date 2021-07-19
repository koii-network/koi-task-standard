export default async function migratePreRegister(state, action) {
  const registeredRecords = state.registeredRecords;
  const input = action.input;
  const contractId = input.contractId;
  const mainContactId = input.mainContactId;

  const contractState = await SmartWeave.contracts.readContractState(
    mainContactId
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