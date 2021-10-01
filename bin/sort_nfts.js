const axios = require("axios");
const Arweave = require("arweave");
const { arrayToHex } = require("smartweave/lib/utils");
const fs = require("fs");

const CHUNK_SIZE = 2000;
const MAX_REQUEST = 100;

const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
  timeout: 60000,
  logging: false
});

async function main() {
  let nfts = Object.values(
    (await axios.get("https://mainnet.koii.live/attention")).data.nfts
  ).flat();
  const narccis1 = JSON.parse(
    fs.readFileSync("/Users/makdasebhatu/Downloads/NFT_IDS_1_100.txt")
  );
  const narccis2 = JSON.parse(
    fs.readFileSync("/Users/makdasebhatu/Downloads/NFT_IDS_2_100.txt")
  );
  const narccis3 = JSON.parse(
    fs.readFileSync("/Users/makdasebhatu/Downloads/NFT_IDS_3_100.txt")
  );
  const narccis4 = JSON.parse(
    fs.readFileSync("/Users/makdasebhatu/Downloads/NEW_NFTID_ARR_100.txt")
  );
  let combinedArray = [];

  combinedArray.push(
    ...nfts,
    ...narccis1,
    ...narccis2,
    ...narccis3,
    ...narccis4
  );
  // Clean NFT list
  combinedArray = combinedArray.filter(
    (ele, pos) =>
      combinedArray.indexOf(ele) === pos &&
      typeof ele === "string" &&
      ele.length === 43
  );

  let txInfos = [];
  for (let i = 0; i < combinedArray.length; i += CHUNK_SIZE) {
    const chunk = combinedArray.slice(i, i + CHUNK_SIZE);
    txInfos = txInfos.concat(await fetchTransactions(chunk));
  }

  await sortTransactions(arweave, txInfos);
  const sortedTxIds = txInfos.map((tx) => tx.node.id);

  // const missingNfts = nfts.filter((nftId) => !sortedTxIds.includes(nftId));

  fs.writeFileSync("dist/sortedTxIds.json", JSON.stringify(sortedTxIds));
  console.log("done");
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
          owner { address }
          recipient
          tags { name value }
          block { height id timestamp }
          fee { winston }
          quantity { winston }
          parent { id }
        }
        cursor
      }
    }
  }`;
  const res = await arweave.api.post("graphql", { query });
  return res.data.data.transactions;
}

// Exact copy of smartweave implementation
async function sortTransactions(arweave, txInfos) {
  const addKeysFuncs = txInfos.map((tx) => addSortKey(arweave, tx));
  await Promise.all(addKeysFuncs);
  txInfos.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
async function addSortKey(arweave, txInfo) {
  const { node } = txInfo;
  const blockHashBytes = arweave.utils.b64UrlToBuffer(node.block.id);
  const txIdBytes = arweave.utils.b64UrlToBuffer(node.id);
  const concatted = arweave.utils.concatBuffers([blockHashBytes, txIdBytes]);
  const hashed = arrayToHex(await arweave.crypto.hash(concatted));
  const blockHeight = `000000${node.block.height}`.slice(-12);
  txInfo.sortKey = `${blockHeight},${hashed}`;
}

main();
