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
  await Promise.all(
    contractIds.map(async (contractId) => {
      const contractState = await SmartWeave.contracts
        .readContractState(contractId)
        .catch((e) => {
          if (e.type !== "TX_NOT_FOUND") throw e;
        });
      if (contractState) {
        const registeredNfts = Object.keys(contractState.nfts);
        state.preRegisterDatas = state.preRegisterDatas.filter(
          (preRegisterData) =>
            !registeredNfts.includes(preRegisterData.content.nft) &&
            preRegisterData.insertBlock + 720 > SmartWeave.block.height
        );
      }
    })
  );
  state.cleanPreRegisterBlock = SmartWeave.block.height + 60;
  return { state };
}
