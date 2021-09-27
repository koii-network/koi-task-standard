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

//const contractId = "BroAWSa9f-qAcf6j9TqGwWxxff6V1SeRfsZdY4PUg_4"; // attention contract
const contractId = "SZCmcvdDbl1ndY11qTVOxkd9_cTzfHHp3DkM_xuLLuY"; // koii Contract
// const input = {
//   function: "cleanPreRegister"
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
//   target: "D3lK6_xXvBUXMUyA2RJz3soqmLlztkv-gVpEP5AlVUo",
//   qty: 1
// };
// const input = {
//   function: "rankPrepDistribution"
// };
const input = {
  function: "registerTask",
  taskName: "Attention_Game",
  taskTxId: "BroAWSa9f-qAcf6j9TqGwWxxff6V1SeRfsZdY4PUg_4"
};
// const input = {
//   function: "burnKoi",
//   contractId: "bHcuebblye6FLTLA3-2uK_1BUJNdxdTFxUECpi5kupk",
//   contentType: "nft",
//   contentTxId: "FIlzvqCCfwDUhFI83tOXH2BGFdNCSPndTjluROy_BvE"
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
