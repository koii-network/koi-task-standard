const fs = require("fs");
const Arweave = require("arweave");
require("dotenv").config();
const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
  timeout: 60000,
  logging: false
});

const EXE_PATH = "src/attention/executable.js";

const walletPath = process.env.WALLET_LOCATION;
const wallet = JSON.parse(fs.readFileSync(walletPath));
const exeSrc = fs.readFileSync(EXE_PATH, "utf8");
async function main() {
  // Let's first create the contract transaction.
  let tx = await arweave.createTransaction({ data: exeSrc }, wallet);
  tx.addTag("Content-Type", "application/javascript");
  tx.addTag("User-Agent", "ArweaveDeploy/1.9.1");
  // Sign
  await arweave.transactions.sign(tx, wallet);

  // Deploy the Executable file
  await arweave.transactions.post(tx);

  console.log(`Deployed executable successfully with ID ${tx.id}`);
}

main();
