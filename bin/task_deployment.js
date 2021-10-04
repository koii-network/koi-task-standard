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

const walletPath = process.env.WALLET_LOCATION;
if (!walletPath) throw new Error("WALLET_LOCATION not specified in .env");
const contractName = process.argv[2];
if (!contractName) throw new Error("task name not specified");
const wallet = JSON.parse(fs.readFileSync(walletPath));
const src = fs.readFileSync(`dist/${contractName}.js`);
const state = fs.readFileSync(`src/${contractName}/init_state.json`);
const EXE_PATH = `src/${contractName}/executable.js`;

async function main() {
  const executableId = await deployExecutable();
  console.log(`Deployed Executable with ID ${executableId}`);
  await checkTxConfirmation(executableId, "executable");
  const initState = JSON.parse(state);
  initState.executableId = executableId;
  const id = await smartweave.createContract(
    arweave,
    wallet,
    src,
    JSON.stringify(initState)
  );
  console.log(`Deployed ${contractName} Contract with ID ${id}`);
  await checkTxConfirmation(id, contractName);
  fs.writeFileSync("dist/Transaction.json", JSON.stringify({ id }));
}

async function deployExecutable() {
  const exeSrc = fs.readFileSync(EXE_PATH, "utf8");
  let tx = await arweave.createTransaction({ data: exeSrc }, wallet);
  tx.addTag("Content-Type", "application/javascript");
  tx.addTag("User-Agent", "ArweaveDeploy/1.9.1");
  // Sign
  await arweave.transactions.sign(tx, wallet);

  // Deploy the Executable file
  await arweave.transactions.post(tx);
  return tx.id;
}

async function checkTxConfirmation(txId, name) {
  console.log(`TxId: ${txId}\nWaiting for confirmation`);
  const start = Date.now();
  for (;;) {
    try {
      await arweave.transactions.get(txId);
      console.log(`${name} transaction id found`);
      return true;
    } catch (e) {
      if (e.type === "TX_FAILED") {
        console.error(e.type, "While checking tx confirmation");
        return false;
      }
    }
    console.log(Math.round((Date.now() - start) / 60000) + "m waiting");
    await sleepAsync(60000); // Wait 1m before checks to not get rate limited
  }
}

async function sleepAsync(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

main();
