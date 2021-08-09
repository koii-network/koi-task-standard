export default async function cleanInvalidTransactions(state) {
  const registeredRecords = state.registeredRecords;

  const registeredNfts = Object.values(registeredRecords);
  const registerdTransactions = registeredNfts.reduce(
    (acc, curVal) => acc.concat(curVal),
    []
  );
  await Promise.all(
    registerdTransactions.map(async (transaction) => {
      const transactionStatus =
        await SmartWeave.unsafeClient.transactions.getStatus(transaction);

      if (transactionStatus.status === 404) {
        for (const address in registeredRecords) {
          if (registeredRecords[address].includes(transaction)) {
            const index = registeredRecords[address].indexOf(transaction);
            registeredRecords[address].splice(index, 1);
          }
        }
      }
    })
  );
  return { state };
}
