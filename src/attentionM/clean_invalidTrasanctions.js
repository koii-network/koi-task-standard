export default async function cleanInvalidTransation(state, action) {
  const registeredNfts = state.registeredNfts;
  //const caller = action.caller;
  const registerdTransactions = Object.keys(registeredNfts);
  await Promise.all(
    registerdTransactions.map(async (transaction) => {
      const transactionStatus = await SmartWeave.transaction.getStatus(
        transaction
      );
      if (transactionStatus.status === 404) {
        delete registeredNfts[transaction];
      }
    })
  );
  return { state };
}
