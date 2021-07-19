const smartest = require("@_koi/smartest");
const Arweave = require("arweave");
const fs = require("fs");

if (process.argv[2] === undefined) throw "Wallet path not defined";

async function main() {
  const arweave = Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https",
    timeout: 20000,
    logging: false
  });

  const wallet = JSON.parse(fs.readFileSync(process.argv[2]));
  const walletAddress = await arweave.wallets.jwkToAddress(wallet);

  // Load koi contract
  const koiSrc = fs.readFileSync(`dist/koi.js`, "utf8");
  const koiContractId = "a1s2d3f4";
  const koiInitState = JSON.parse(fs.readFileSync(`src/koi/init_state.json`));
  smartest.writeContractState(koiContractId, koiInitState);

  // Load attention contract
  const attentionSrc = fs.readFileSync(`dist/attentionM.js`, "utf8");
  const attentionContractId = "q5w6e7r8";
  const attentionInitState = JSON.parse(
    fs.readFileSync(`src/attentionM/init_state.json`)
  );
  smartest.writeContractState(attentionContractId, attentionInitState);

  console.log(
    "Koi initial states: ",
    smartest.readContractState(koiContractId),
    "Attention initial states:",
    smartest.readContractState(attentionContractId)
  );
}

main().then(() => {
  console.log("Test complete");
});
