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
const contract = process.argv[2];
if (!contract) throw new Error("task name not specified");

const wallet = JSON.parse(fs.readFileSync(walletPath));
const src = fs.readFileSync(`dist/${contract}.js`);
const state = fs.readFileSync(`src/${contract}/init_state.json`);
const EXE_PATH = `src/${contract}/executable.js`;
async function deploy() {
  const id = await smartweave.createContract(arweave, wallet, src, state);
  console.log(`Deployed ${contract} Contract with ID ${id}`);
  await checkTxConfirmation(id, contract);
  console.log(`Deployed Executable with ID ${id}`);
  const executabeId = await deployExecutable();
  await registerExecutable(id, executabeId);
  fs.writeFileSync("dist/Transaction.json", JSON.stringify({ id }));
}
const registerExecutable = async (contractId, executableId) => {
  const input = {
    function: "registerExecutableId",
    executableId: executableId
  };
  console.log("Writing", input.function);
  const txId = await smartweave.interactWrite(
    arweave,
    wallet,
    contractId,
    input
  );
  await checkTxConfirmation(txId, "register executable");
};

const deployExecutable = async () => {
  const exeSrc = fs.readFileSync(EXE_PATH, "utf8");
  let tx = await arweave.createTransaction({ data: exeSrc }, wallet);
  tx.addTag("Content-Type", "application/javascript");
  tx.addTag("User-Agent", "ArweaveDeploy/1.9.1");
  // Sign
  await arweave.transactions.sign(tx, wallet);

  // Deploy the Executable file
  await arweave.transactions.post(tx);
  await checkTxConfirmation(tx.id, "executable");
  return tx.id;
};
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

(async () => await deploy())();
