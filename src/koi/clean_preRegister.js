export default async function cleanPreRegister(state, action) {
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
      state.preRegisterDatas = state.preRegisterDatas.filter(
        (preRegisterData) => !(preRegisterData.content.nftId in registerRecords)
      );
    })
  );
  return { state };
}
