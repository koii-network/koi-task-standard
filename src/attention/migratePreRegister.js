export default async function migratePreRegister(state) {
  const registeredRecords = state.registeredRecords;
  const mainContactId = state.koiiContract;
  const transaction = await SmartWeave.unsafeClient.transactions.get(
    SmartWeave.transaction.id
  );
  let contractId;
  transaction.get("tags").forEach((tag) => {
    if (tag.get("name", { decode: true, string: true }) == "Contract") {
      contractId = tag.get("value", { decode: true, string: true });
    }
  });

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
        !registeredRecords[preRegisterNft.owner].includes(
          preRegisterNft.content.nftId
        ) &&
        !registeredNfts.some((nfts) =>
          nfts.includes(preRegisterNft.content.nftId)
        )
      ) {
        registeredRecords[preRegisterNft.owner].push(
          preRegisterNft.content.nftId
        );
      }
    } else {
      registeredRecords[preRegisterNft.owner] = [preRegisterNft.content.nftId];
    }
  });
  return { state };
}
