const fs = require("fs");
const axios = require("axios");
const Arweave = require("arweave");
const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
  timeout: 60000,
  logging: false
});

async function main() {
  // const contractSrcsB64 = new Set();
  // const tagNameB64 = "Q29udHJhY3QtU3Jj"; // "Contract-Src" encoded as b64
  // const nftMap = (await axios.get("https://mainnet.koii.live/attention")).data
  //   .nfts;
  // const nfts = Object.values(nftMap).flat();
  // for (let i = 0; i < nfts.length; ++i) {
  //   let contractSrcTag;
  //   try {
  //     const txInfo = await arweave.transactions.get(nfts[i]);
  //     contractSrcTag = txInfo.tags.find((tag) => tag.name === tagNameB64);
  //   } catch (e) {
  //     console.error(e);
  //   }
  //   if (contractSrcTag && contractSrcTag.value)
  //     contractSrcsB64.add(contractSrcTag.value);
  //   console.log("Done", i + 1, "/", nfts.length);
  // }
  // fs.writeFileSync(
  //   "contract_srcs_b64.json",
  //   JSON.stringify(Array.from(contractSrcsB64))
  // );
}

main();
