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

//const contractId = "XRM5UNc1t_Syu0j9sISHysxVcAAb5zCb3VG6SyFu0KU"; // test attention contract
//const contractId = "A1EeIXrknsb7SlBxHAboXSQIpcmTesvEykhU45uwig4"; // test koii Contract
//const contractId = "NwaSMGCdz6Yu5vNjlMtCNBmfEkjYfT-dfYkbQQDGn5s"; // attention in production
//const contractId = "QA7AIFVx1KBBmzC7WUNhJbDsHlSJArUT0jWrhZMZPS8"; // koii Contract in production
//const contractId = "FIlzvqCCfwDUhFI83tOXH2BGFdNCSPndTjluROy_BvE"; // nft id
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
//   target: "DymtKHHegWz-HWrNnOL12Rxz_7dLrY2R3wVwTFE8788",
//   qty: 1
// };
// const input = {
//   function: "rankPrepDistribution"
// };
// const input = {
//   function: "registerTask",
//   taskName: "Attention_Game",
//   taskTxId: "XRM5UNc1t_Syu0j9sISHysxVcAAb5zCb3VG6SyFu0KU"
// };
// const input = {
//   function: "burnKoi",
//   contractId: "XRM5UNc1t_Syu0j9sISHysxVcAAb5zCb3VG6SyFu0KU",
//   contentType: "nft",
//   contentTxId: "vNFdxL_qZU0AbtbQiBCy7yXx7XwTcNnWs28eXpomPCA"
// };
// const input = {
//   function: "mint",
//   target: "6VJYLb6lvBISrgRbhd1ODHzJ1xAh3ZA3OdSY20E88Bg",
//   qty: 100
// };
// const input = {
//   function: "registerExecutableId",
//   executableId: "ER_gAIuBsI5-OVt6GrCGUPfgiu8hjtvFgEO-Eow6aoc"
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
