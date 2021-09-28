export default async function cleanPreRegister(state) {
  const preRegisterDatas = state.preRegisterDatas;
  const cleanPreRegisterStatus = state.cleanPreRegisterBlock;
  if (cleanPreRegisterStatus > SmartWeave.block.height) {
    throw new ContractError("Clean already happen");
  }
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
      const registeredNfts = Object.keys(contractState.nfts);
      state.preRegisterDatas = state.preRegisterDatas.filter(
        (preRegisterData) =>
          !registeredNfts.includes(preRegisterData.content.nft)
      );
    })
  );
  state.cleanPreRegisterBlock = SmartWeave.block.height + 60;
  return { state };
}
