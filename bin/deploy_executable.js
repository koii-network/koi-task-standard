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
  let tx = await arweave.createTransaction({ data: exeSrc }, wallet);
  tx.addTag("Content-Type", "application/javascript");
  await arweave.transactions.sign(tx, wallet);

  console.log("Uploading", tx.id);
  let uploader = await arweave.transactions.getUploader(tx);
  while (!uploader.isComplete) {
    await uploader.uploadChunk();
    console.log(
      `${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`
    );
  }
  const status = await arweave.transactions.getStatus(tx.id);
  console.log(`Created NFT successfully with ID ${tx.id}`, status);
}

main();
