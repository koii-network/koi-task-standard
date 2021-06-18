const fs = require("fs");
const Arweave = require("arweave");
const smartweave = require("smartweave");
require("dotenv").config();
const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
  timeout: 20000,
  logging: false
});

const wallet = process.env.WALLET_LOCATION;
if (!wallet) {
  console.error("Wallet path not specified in .env, aborting");
  process.exit(1);
}
const walletParse = JSON.parse(fs.readFileSync(wallet));
const contract = process.argv[2];
if (!contract) {
  console.error("Contract name not specified, aborting");
  process.exit(2);
}
const src = fs.readFileSync(`dist/${contract}.js`);
const state = fs.readFileSync(`src/${contract}/init_state.json`);
async function deploy() {
  const id = await smartweave.createContract(arweave, walletParse, src, state);
  console.log(`Deployed ${contract} Contract with ID ${id}`);
  fs.writeFileSync("dist/Transaction.json", JSON.stringify({ id }));
}

(async () => await deploy())();
