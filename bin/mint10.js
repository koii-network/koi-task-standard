// Error codes
// https://github.com/ArweaveTeam/arweave-js/blob/master/src/common/transactions.ts#L70-L105

const fs = require("fs");
const fsProms = require("fs/promises");
const Arweave = require("arweave");
const { interactWrite } = require("smartweave/lib/contract-interact");
const axios = require("axios");

const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
  timeout: 60000,
  logging: false
});

const WRITE_INPUT = {
  function: "mint",
  qty: 10
};
const KOII_CONTRACT = "qzVAzvhwr1JFTPE8lIU9ZG_fuihOmBr7ewZFcT3lIUc";
const API_COOLDOWN = 666; // 1.5 requests per second

let nextApiTime = 0;
console.log("Reading wallet");
let wallet = JSON.parse(fs.readFileSync("../wallet.json"));
// This will only work if the wallet owner is equal to the Koii contract owner

async function main() {
  // console.error(
  //   "This script is dangerous and will mint thousands of Koii, comment this out to run"
  // );
  // console.error(
  //   "Please verify that the wallet is capable of minting on this contract"
  // );
  // return;

  console.log("Getting state");
  const attentionState = (
    await axios.get("https://mainnet.koii.live/attention")
  ).data;
  const attemptArr = Object.keys(attentionState.nfts).map((addr) => {
    return { addr, remaining: 5, tx: null };
  });

  while (attemptArr.some((attempt) => attempt.remaining)) {
    for (const attempt of attemptArr) {
      if (!attempt.remaining) continue;
      try {
        if (attempt.tx === null) {
          attempt.tx = await rateLimitApi("mint", attempt.addr);
        } else {
          const status = await rateLimitApi("status", attempt.tx);
          switch (status) {
            case 202: // pending
            case 404:
              continue;
            case 200: // success
              attempt.remaining = 0;
              console.log("Success", attempt.addr);
              continue;
            default:
              console.log("Minting failed:", attempt, status);
              --attempt.remaining;
              attempt.tx = null;
              if (attempt.remaining)
                attempt.tx = await rateLimitApi("mint", attempt.addr);
          }
        }
      } catch (e) {
        console.log("Error:", e);
      }
    }
  }

  console.log("All done");
  await fsProms.writeFile("mint10.json", JSON.stringify(attemptArr));
}

/**
 * Required since Arweave has a 1000req / 5min rate limit
 *   we stay on the safe side at 500req / 5min
 */
async function rateLimitApi(action, data) {
  const now = Date.now();
  if (now < nextApiTime)
    await new Promise((resolve) => setTimeout(resolve, nextApiTime - now));
  nextApiTime = now + API_COOLDOWN;

  switch (action) {
    case "status":
      return (await arweave.transactions.getStatus(data)).status;
    case "mint":
      console.log("Minting", data);
      WRITE_INPUT.target = data;
      return await interactWrite(arweave, wallet, KOII_CONTRACT, WRITE_INPUT);
  }
}

main();
