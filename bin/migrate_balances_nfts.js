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

const LEGIT_NFT = "Vh-o7iOqOYOOHhUW2z9prtrtH8hymQyjX-rTxAY0jjU";

async function main() {
  // console.log("Computing old state");
  // const oldKoiiState = await smartweave.readContract(
  //   arweave,
  //   "cETTyJQYxJLVQ6nC3VxzsZf1x2-6TW2LFkGZa91gUWc"
  // );

  console.log("getting state");
  const oldKoiiState = (
    await axios.get("https://devbundler.openkoi.com:8888/state/current")
  ).data;
  const oldNfts = oldKoiiState.registeredRecord;

  // Get spam owners
  console.log("getting top content");
  const topContent = (
    await axios.get(
      "https://devbundler.openkoi.com:8888/state/top-content-predicted"
    )
  ).data;
  const spamOwners = new Set();
  for (let i = 0; i < topContent.length; ++i) {
    const content = Object.values(topContent[i])[0];
    if (content.txIdContent === LEGIT_NFT) break;
    spamOwners.add(content.owner);
  }
  const spamNfts = [];

  // Migrate nfts and remove spammer nfts
  const newNfts = {};
  for (const nftId in oldNfts) {
    const owner = oldNfts[nftId];
    if (spamOwners.has(owner)) {
      spamNfts.push(nftId);
      continue;
    }
    if (owner in newNfts) newNfts[owner].push(nftId);
    else newNfts[owner] = [nftId];
  }

  // Migrate and remove spammer balance
  for (const owner in oldKoiiState.balances)
    if (spamOwners.has(owner)) delete oldKoiiState.balances[owner];

  // Migrate attention and remove spammer attention
  const oldRewardReport = oldKoiiState.stateUpdate.trafficLogs.rewardReport;
  const newAttentionReport = [];
  for (const report of oldRewardReport) {
    const logsSummary = report.logsSummary;
    for (const spamNft of spamNfts)
      if (spamNft in logsSummary) {
        delete logsSummary[spamNft];
      }
    newAttentionReport.push(logsSummary);
  }

  // Write to files in dist to be manually moved into init_state.json
  fs.writeFileSync("dist/nft_map.json", JSON.stringify(newNfts));
  fs.writeFileSync("dist/balances.json", JSON.stringify(oldKoiiState.balances));
  fs.writeFileSync("dist/attention.json", JSON.stringify(newAttentionReport));
}

main();
