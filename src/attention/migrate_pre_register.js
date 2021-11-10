export default async function migratePreRegister(state) {
  const mainContactId = state.koiiContract;
  const validContractSrc = state.validContractSrcs;
  const contractId = SmartWeave.contract.id;
  const contractState = await SmartWeave.contracts.readContractState(
    mainContactId
  );
  let registeredContents = [];
  for (let data of Object.values(state.contents)) {
    registeredContents.push(Object.keys(data));
  }
  const preRegisterContents = contractState.preRegisterDatas.filter(
    (data) =>
      "content" in data &&
      data.contractId === contractId &&
      !registeredContents.flat().includes(Object.values(data.content)[0])
  );
  const newNfts = [];
  const newContents = [];
  for (const data of preRegisterContents) {
    if ("nft" in data.content && !newNfts.includes(data.content.nft)) {
      newNfts.push(data.content.nft);
    } else if (
      !("nft" in data.content) &&
      !newContents.includes({ ...data.content, owner: data.owner })
    ) {
      const content = { ...data.content, owner: data.owner };
      newContents.push(content);
    }
  }
  // add nfts
  if (newNfts.length !== 0) {
    const txInfos = await fetchTransactions(newNfts);
    // Filter out transactionIds with Invalid contractSrc.
    const validTransactionIds = txInfos.filter((transaction) => {
      const contractSrc = transaction.node.tags.find(
        (tag) => tag.name === "Contract-Src"
      );
      return contractSrc && validContractSrc.includes(contractSrc.value);
    });
    for (const transaction of validTransactionIds) {
      const nftState = await SmartWeave.contracts
        .readContractState(transaction.node.id)
        .catch((e) => {
          if (e.type !== "TX_NOT_FOUND") throw e;
        });
      if (nftState && "balances" in nftState) {
        const creatorShare = {};
        let creator = nftState.owner || nftState.creator;
        if (!creator) {
          creator = transaction.node.owner.address;
        }
        const creatorShareFromTag = transaction.node.tags.find(
          (tag) => tag.name === "Creator-Share"
        );
        if (nftState["creator_share"] || nftState["creatorShare"]) {
          const share =
            Number(nftState["creator_share"]) ||
            Number(nftState["creatorShare"]);
          typeof share === "number"
            ? (creatorShare[creator] = share)
            : (creatorShare[creator] = 0.1);
          state.contents.nfts[transaction.node.id] = {
            creatorShare: creatorShare
          };
        } else if (creatorShareFromTag) {
          const share = Number(creatorShareFromTag.value);
          typeof share === "number"
            ? (creatorShare[creator] = share)
            : (creatorShare[creator] = 0.1);
          state.contents.nfts[transaction.node.id] = {
            creatorShare: creatorShare
          };
        } else {
          creatorShare[creator] = 0.1;
          state.contents.nfts[transaction.node.id] = {
            creatorShare: creatorShare
          };
        }
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
        state.contents.nfts[transaction.node.id]["owners"] = owners;
      }
    }
  }
  //add other contents different from nft
  if (newContents.length !== 0) {
    for (let content of newContents) {
      const contentType = Object.keys(content)[0];
      const contentId = content[contentType];
      contentType in state.contents
        ? (state.contents[contentType][contentId] = content.owner)
        : (state.contents[contentType] = { [contentId]: content.owner });
    }
  }

  return { state };
}

async function fetchTransactions(ids) {
  let transactions = await getNextPage(ids);
  let txInfos = transactions.edges;

  while (transactions.pageInfo.hasNextPage) {
    const cursor = transactions.edges[transactions.edges.length - 1].cursor;
    transactions = await getNextPage(ids, cursor);
    txInfos = txInfos.concat(transactions.edges);
  }
  return txInfos;
}

async function getNextPage(ids, after) {
  const afterQuery = after ? `,after:"${after}"` : "";
  const query = `query {
    transactions(ids: ${JSON.stringify(ids)}, sort: HEIGHT_ASC, block: {max: ${
    SmartWeave.block.height
  }}, first: 100${afterQuery}) {
      pageInfo { hasNextPage }
      edges {
        node {
          id
          owner {
                  address
                }
          tags { name value }
        }
        cursor
      }
    }
  }`;
  const res = await SmartWeave.unsafeClient.api.post("graphql", { query });
  return res.data.data.transactions;
}
