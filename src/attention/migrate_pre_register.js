export default async function migratePreRegister(state) {
  const mainContactId = state.koiiContract;
  const validContractSrc = state.validContractSrcsB64;
  const contractId = SmartWeave.contract.id;
  //const tagNameB64 = "Q29udHJhY3QtU3Jj"; // "Contract-Src" encoded as b64
  const contractState = await SmartWeave.contracts.readContractState(
    mainContactId
  );
  const preRegisterDatas = contractState.preRegisterDatas;
  const preRegisterNfts = preRegisterDatas.filter(
    (preRegisterNft) =>
      "nft" in preRegisterNft.content &&
      preRegisterNft.contractId === contractId
  );
  const nfts = Object.keys(state.nfts);
  const nonMigratedNfts = preRegisterNfts.filter(
    (nft) => !nfts.includes(nft.content.nft)
  );
  const nftIds = [];
  nonMigratedNfts.map((nft) => {
    nftIds.push(nft.content.nft);
  });
  //deduplicate nftIds
  const uniqueNfts = [...new Set(nftIds)];
  const MAX_REQUEST = 100;
  const CHUNK_SIZE = 2000;
  let txInfos = [];
  for (let i = 0; i < uniqueNfts.length; i += CHUNK_SIZE) {
    const chunk = uniqueNfts.slice(i, i + CHUNK_SIZE);
    txInfos = txInfos.concat(await fetchTransactions(chunk));
  }
  async function fetchTransactions(ids) {
    let transactions = await getNextPage(ids);
    let txInfos = transactions.edges;

    while (transactions.pageInfo.hasNextPage) {
      const cursor = transactions.edges[MAX_REQUEST - 1].cursor;
      transactions = await getNextPage(ids, cursor);
      txInfos = txInfos.concat(transactions.edges);
    }
    return txInfos;
  }
  async function getNextPage(ids, after) {
    const afterQuery = after ? `,after:"${after}"` : "";
    const query = `query {
    transactions(ids: ${JSON.stringify(
      ids
    )}, sort: HEIGHT_ASC, first: ${MAX_REQUEST}${afterQuery}) {
      pageInfo { hasNextPage }
      edges {
        node {
          id
          tags { name value }
        }
        cursor
      }
    }
  }`;
    const res = await SmartWeave.unsafeClient.api.post("graphql", { query });
    return res.data.data.transactions;
  }
  // Filter out transactionIds with Invalid contractSrc.
  const validTransactionIds = txInfos.filter((transaction) => {
    const contractSrc = transaction.node.tags.find(
      (tag) => tag.name === "Contract-Src"
    );
    return validContractSrc.includes(contractSrc.value);
  });
  await Promise.allSettled(
    validTransactionIds.map(async (transaction) => {
      const nftState = await SmartWeave.contracts.readContractState(
        transaction.node.id
      );
      if ("balances" in nftState) {
        const owners = {};
        for (let owner in nftState.balances) {
          if (
            nftState.balances[owner] > 0 &&
            typeof owner === "string" &&
            owner.length === 43 &&
            !(owner.indexOf(" ") >= 0)
          )
            owners[owner] = nftState.balances[owner];
        }
        state.nfts[transaction.node.id] = owners;
      }
    })
  );
  return { state };
}
