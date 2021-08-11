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
  const registeredNfts = Object.values(registeredRecords);
  preRegisterNfts.map((preRegisterNft) => {
    if (preRegisterNft.owner in registeredRecords) {
      if (
        registeredRecords[preRegisterNft.owner].includes(
          preRegisterNft.content.nftId
        )
      ) {
        throw new ContractError(
          `${preRegisterNft.content.nftId} is already registered`
        );
      }
      if (
        registeredNfts.some((nfts) =>
          nfts.includes(preRegisterNft.content.nftId)
        )
      ) {
        throw new ContractError(
          `${preRegisterNft.content.nftId} is already registered under another owner`
        );
      }
      registeredRecords[preRegisterNft.owner].push(
        preRegisterNft.content.nftId
      );
    } else {
      registeredRecords[preRegisterNft.owner] = [preRegisterNft.content.nftId];
    }
  });
  return { state };
}
