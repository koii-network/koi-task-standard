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

//const contractId = "RbHbau1GLamtzyB-Wg3XlJJRGPJaO2hl-xjswFydd1w"; // test attention contract
const contractId = "T7NmmpxLSZsWrjl2-A1KgEuOi9kXqb8FAb4tZAjeTm0"; // test koii Contract
//const contractId = "mBwqmXIuzmKem6xIQa-3nDwSYyg9OrnatYaTU4L35GA"; // attention in production
//const contractId = "qzVAzvhwr1JFTPE8lIU9ZG_fuihOmBr7ewZFcT3lIUc"; // koii Contract in production
//const contractId = "FIlzvqCCfwDUhFI83tOXH2BGFdNCSPndTjluROy_BvE"; // nft id
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
//   target: "DymtKHHegWz-HWrNnOL12Rxz_7dLrY2R3wVwTFE8788",
//   qty: 1
// };
// const input = {
//   function: "rankPrepDistribution"
// };
// const input = {
//   function: "registerTask",
//   taskName: "Attention_Game",
//   taskTxId: "RbHbau1GLamtzyB-Wg3XlJJRGPJaO2hl-xjswFydd1w"
// };
// "EKW3AApL4mdLc6sIhVr3Cn8VN7N9VAQUp2BNALHXFtQ": {
//     "sQTWslyCdKF6oeQ7xXUYUV1bluP0_5-483FXH_RVZKU": 1
//   },
//   "1UDe0Wqh51-O03efPzoc_HhsUPrmgBR2ziUfaI7CpZk": {
//     "WL32qc-jsTxCe8m8RRQfS3b3MacsTQySDmJklvtkGFc": 1
//   },
const input = {
  function: "burnKoi",
  contractId: "OExsbvsnl5qy5sj6pa5_zyUg_4IwU8iQgfTkK_vTZy4",
  contentType: "nft",
  contentTxId: "eBwSsqdX4rASxCpEeUylrD4K4hZb8D1u6FefKvZyChk"
};
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
