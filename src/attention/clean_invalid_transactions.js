export default async function cleanInvalidTransactions(state) {
  const nfts = state.nfts;

  const registeredNfts = Object.values(nfts);
  const registerdTransactions = registeredNfts.reduce(
    (acc, curVal) => acc.concat(curVal),
    []
  );
  await Promise.all(
    registerdTransactions.map(async (transaction) => {
      const transactionStatus =
        await SmartWeave.unsafeClient.transactions.getStatus(transaction);

      if (transactionStatus.status === 404) {
        for (const address in nfts) {
          if (nfts[address].includes(transaction)) {
            const index = nfts[address].indexOf(transaction);
            nfts[address].splice(index, 1);
          }
        }
      }
    })
  );
  return { state };
}
