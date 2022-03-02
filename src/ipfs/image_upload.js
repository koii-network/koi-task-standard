const { create } = require("ipfs-http-client");
const fs = require("fs");
const smartest = require("@_koi/smartest");
const Arweave = require("arweave");

if (process.argv[2] === undefined) throw "Wallet path not defined";

async function main() {
  let ipfs = await create({
    host: "ipfs.infura.io",
    port: 5001,
    protocol: "https"
  });

  let data = fs.readFileSync("../../diagram/attention_diagram.jpg");

  let options = {
    warpWithDirectory: false,
    progress: (prog) => console.log(`Saved :${prog}`)
  };
  let result = await ipfs.add(data, options);
  console.log(result);
  const arweave = Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https",
    timeout: 20000,
    logging: false
  });

  const wallet = JSON.parse(fs.readFileSync(process.argv[2]));
  const walletAddress = await arweave.wallets.jwkToAddress(wallet);

  // Load image contract
  const imageSrc = fs.readFileSync(`./image_contract.js`, "utf8");
  const imageContractId = "a1s2d3f45";
  const imageInitState = JSON.parse(fs.readFileSync(`./init_state_image.json`));
  smartest.writeContractState(imageContractId, imageInitState);

  const upload_input = {
    function: "upload",
    hash: result.path
  };

  const upload_id = await smartest.interactWrite(
    arweave,
    imageSrc,
    wallet,
    upload_input,
    smartest.readContractState(imageContractId),
    walletAddress,
    imageContractId
  );

  console.log("Upload state", upload_id);

  console.log(smartest.readContractState(imageContractId));
}

main().then(() => {
  console.log("Test complete");
});

// async function ipfsClient() {
//   const ipfs = await create({
//     host: "ipfs.infura.io",
//     port: 5001,
//     protocol: "https"
//   });
//   return ipfs;
// }

// async function saveText() {
//   let ipfs = await ipfsClient();

//   let result = await ipfs.add(`welcome ${new Date()}`);
//   console.log(result);
// }

// saveText();

// async function saveFile() {
//   let ipfs = await ipfsClient();

//   let data = fs.readFileSync("../../diagram/attention_diagram.jpg");
//   //let data = fs.readFileSync("");
//   let options = {
//     warpWithDirectory: false,
//     progress: (prog) => console.log(`Saved :${prog}`)
//   };
//   let result = await ipfs.add(data, options);
//   console.log(result);
// }
// saveFile();

// async function getData(hash) {
//   let ipfs = await ipfsClient();

//   let asyncitr = ipfs.cat(hash);

//   for await (const itr of asyncitr) {
//     let data = Buffer.from(itr).toString();
//     console.log(data);
//   }
//}
