const fs = require("fs");
const Arweave = require("arweave");
const smartweave = require("smartweave");
require("dotenv").config();
const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
  timeout: 60000,
  logging: false
});

const walletPath = process.env.WALLET_LOCATION;
const wallet = JSON.parse(fs.readFileSync(walletPath));
//const contractId = "p1fnx1unoxJ1txvIzc8NcQybMvY78UdHSZBm6XPeEj4"; // test attention contract
const contractId = "gPWdE3c2nkuB_46mdxt3RQvrRELj_oN1g0uk8xwsqII"; // test koii Contract
//const contractId = "rCgc9NOBriEv21wV98FWb7n_ySggRibpPJpWxEgNxqI"; // attention in production
//const contractId = "QA7AIFVx1KBBmzC7WUNhJbDsHlSJArUT0jWrhZMZPS8"; // koii Contract in production

//const contractId = "F4EzkpUtE01G6FFJ08TJ3V2fZ5jWuhWQhg9OezOshIM"; // nft id
// const input = {
//   function: "cleanPreRegister"
// };
// const input = {
//   function: "mint",
//   qty: 500,
//   target: "6E4APc5fYbTrEsX3NFkDpxoI-eaChDmRu5nqNKOn37E"
// };
// const input = {
//   function: "syncOwnership",
//   txId: "FIlzvqCCfwDUhFI83tOXH2BGFdNCSPndTjluROy_BvE"
// };
// const input = {
//   function: "migratePreRegister"
// };
// const input = {
//   function: "transfer",
//   target: "K4XidM-x1LXErn0H-w74Czm7LscUITUWfGonbUAXiLU",
//   qty: 1
// };
// const input = {
//   function: "rankPrepDistribution"
// };
// const input = {
//   function: "registerValidContractSrc",
//   contractSrc: "hmqdldElrUGT23q9dlegLZIABnYO8iQ03CHSEbEZYMo"
// };
// const input = {
//   function: "registerTask",
//   taskName: "storecat",
//   taskTxId: "lx1W5RKfGyeY-OUxmjMQsxnK7iYPMeq5wFPZ0K-X7fg"
// };
const input = {
  function: "burnKoi",
  contractId: "p1fnx1unoxJ1txvIzc8NcQybMvY78UdHSZBm6XPeEj4",
  contentType: "video",
  contentTxId: "zM1t8lVqi8zztoNF8CYe8tr3g7FvYHfkCdmyxwySYqs"
};
// const input = {
//   function: "mint",
//   target: "6VJYLb6lvBISrgRbhd1ODHzJ1xAh3ZA3OdSY20E88Bg",
//   qty: 100
// };
// const input = {
//   function: "registerExecutableId",
//   executableId: "A2LQ5-Kaom_AMb0jBj82-Z-T6D_BkURVWhDZyocWEEA"
// };
async function main() {
  console.log("Writing", input.function);
  const txId = await smartweave.interactWrite(
    arweave,
    wallet,
    contractId,
    input
  );
  await checkTxConfirmation(txId);
}

async function checkTxConfirmation(txId) {
  console.log(`TxId: ${txId}\nWaiting for confirmation`);
  const start = Date.now();
  for (;;) {
    try {
      await arweave.transactions.get(txId);
      console.log(`Transaction found`);
      return true;
    } catch (e) {
      if (e.type === "TX_FAILED") {
        console.error(e.type, "While checking tx confirmation");
        return false;
      }
    }
    console.log(Math.round((Date.now() - start) / 60000) + "m waiting");
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10s before checks to not get rate limited
  }
}

main();
