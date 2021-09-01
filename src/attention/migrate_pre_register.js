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
      "nft" in preRegisterNft.content &&
      preRegisterNft.contractId === contractId
  );
  const registeredNfts = Object.values(registeredRecords).reduce(
    (acc, curVal) => acc.concat(curVal),
    []
  );
  await Promise.allSettled(
    preRegisterNfts.map(async (preRegisterNft) => {
      const txStatus = await SmartWeave.unsafeClient.transactions.getStatus(
        preRegisterNft.content.nft
      );
      if (
        txStatus.status === 200 &&
        !registeredNfts.includes(preRegisterNft.content.nft)
      ) {
        if (preRegisterNft.owner in registeredRecords) {
          {
            registeredRecords[preRegisterNft.owner].push(
              preRegisterNft.content.nft
            );
          }
        } else {
          registeredRecords[preRegisterNft.owner] = [
            preRegisterNft.content.nft
          ];
        }
      }
    })
  );
  return { state };
}
