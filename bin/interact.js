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

const contractId = "xqHqQxiKymk2rnj9arN2N1LtCCk1U875q4lBFlTE094"; // test attention contract
//const contractId = "D2HbbY4dnpC17_YF8dtdQZadR6Erp7Pk4qtZOfa9vzQ"; // test koii Contract
//const contractId = "mBwqmXIuzmKem6xIQa-3nDwSYyg9OrnatYaTU4L35GA"; // attention in production
//const contractId = "QA7AIFVx1KBBmzC7WUNhJbDsHlSJArUT0jWrhZMZPS8"; // koii Contract in production
//const contractId = "FIlzvqCCfwDUhFI83tOXH2BGFdNCSPndTjluROy_BvE"; // nft id
// const input = {
//   function: "cleanPreRegister"
// };
// const input = {
//   function: "mint",
//   qty: 10000,
//   target: "DFocTjuIRI7KPbbB2rb24pmrf10Fv_kB7DYLwUzBhS4"
// };
// const input = {
//   function: "syncOwnership",
//   txId: "FIlzvqCCfwDUhFI83tOXH2BGFdNCSPndTjluROy_BvE"
// };
const input = {
  function: "migratePreRegister"
};
// const input = {
//   function: "transfer",
//   target: "DymtKHHegWz-HWrNnOL12Rxz_7dLrY2R3wVwTFE8788",
//   qty: 1
// };
// const input = {
//   function: "rankPrepDistribution"
// };
// const input = {
//   function: "registerTask",
//   taskName: "Attention_Game",
//   taskTxId: "xqHqQxiKymk2rnj9arN2N1LtCCk1U875q4lBFlTE094"
// };
// const input = {
//   function: "burnKoi",
//   contractId: "xqHqQxiKymk2rnj9arN2N1LtCCk1U875q4lBFlTE094",
//   contentType: "nft",
//   contentTxId: "hAvOySHDaBo9KE4m3cvDhlC4yUh_VjR6rhUIS2c47bs"
// };
// const input = {
//   function: "mint",
//   target: "6VJYLb6lvBISrgRbhd1ODHzJ1xAh3ZA3OdSY20E88Bg",
//   qty: 100
// };
// const input = {
//   function: "registerExecutableId",
//   executableId: "myseSmK1blWYMcG9KeAZFOsMhBfjngKlxAIxvI9SQXI"
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
