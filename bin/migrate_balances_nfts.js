const smartweave = require("smartweave");
const fs = require("fs");
const Arweave = require("arweave");
const axios = require("axios");

const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
  timeout: 60000,
  logging: false
});

async function main() {
  // console.log("Computing old state");
  // const oldKoiiState = await smartweave.readContract(
  //   arweave,
  //   "cETTyJQYxJLVQ6nC3VxzsZf1x2-6TW2LFkGZa91gUWc"
  // );

  const oldKoiiState = (
    await axios.get("https://bundler.openkoi.com:8888/state/current")
  ).data;

  const oldNfts = oldKoiiState.registeredRecord;
  const nftMap = {};

  for (const nftId in oldNfts) {
    const owner = oldNfts[nftId];
    if (owner in nftMap) nftMap[owner].push(nftId);
    else nftMap[owner] = [nftId];
  }

  fs.writeFileSync("dist/nft_map.json", JSON.stringify(nftMap));
  fs.writeFileSync("dist/balances.json", JSON.stringify(oldKoiiState.balances));
}

main();
