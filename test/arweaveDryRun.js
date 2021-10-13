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
async function run() {
  //const contract = "j6fu4HX4zylBaaI1yqLumC2eLn4HBLZhOZOUwYCVeMs"; // main_contract
  const contract = "xqHqQxiKymk2rnj9arN2N1LtCCk1U875q4lBFlTE094"; // attention contract

  const input = {
    function: "migratePreRegister"
  };
  const oldState = await smartweave.readContract(arweave, contract);
  try {
    console.log("about to run dry vote");
    var response = await smartweave.interactWriteDryRun(
      arweave,
      wallet,
      contract,
      input,
      null,
      null,
      null,
      oldState,
      null,
      null
    );
    console.log("response", response.result);
    fs.writeFileSync("state.json", JSON.stringify(response.state));
  } catch (err) {
    console.log("got err", err);
  }
}
run();
