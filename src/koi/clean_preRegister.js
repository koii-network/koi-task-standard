export default async function cleanPreRegister(state) {
  const preRegisterDatas = state.preRegisterDatas;

  const contractIds = [];
  preRegisterDatas.forEach((preRegisterData) => {
    if ("nft" in preRegisterData.content) {
      if (!contractIds.includes(preRegisterData.contractId)) {
        contractIds.push(preRegisterData.contractId);
      }
    }
  });

  await Promise.allSettled(
    contractIds.map(async (contractId) => {
      const contractState = await SmartWeave.contracts.readContractState(
        contractId
      );
      const registeredNfts = Object.values(contractState.nfts).reduce(
        (acc, curVal) => acc.concat(curVal),
        []
      );
      state.preRegisterDatas = state.preRegisterDatas.filter(
        (preRegisterData) =>
          !registeredNfts.includes(preRegisterData.content.nft)
      );
    })
  );
  return { state };
}
