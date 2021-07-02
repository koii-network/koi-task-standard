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
      preRegisterDatas.map((preRegisterData) => {
        if ("nftId" in preRegisterData.content) {
          if (preRegisterData.content.nftId in registerRecords) {
            const index = preRegisterDatas.indexOf(preRegisterData);
            preRegisterDatas.splice(index, 1);
          }
        }
      });
    })
  );
}
