export default async function cleanPreRegister(state) {
  const preRegisterDatas = state.preRegisterDatas;

  const contractIds = [];
  preRegisterDatas.forEach((preRegisterData) => {
    if (!contractIds.includes(preRegisterData.contractId)) {
      contractIds.push(preRegisterData.contractId);
    }
  });

  await Promise.all(
    contractIds.map(async (contractId) => {
      const contractState = await SmartWeave.contracts.readContractState(
        contractId
      );
      const registerRecords = contractState.registeredRecords;
      const registeredContent = Object.values(registerRecords);
      state.preRegisterDatas = state.preRegisterDatas.filter(
        (preRegisterData) =>
          !registeredContent.some((nfts) =>
            nfts.includes(preRegisterData.content.nftId)
          )
      );
    })
  );
  return { state };
}
