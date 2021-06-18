const fs = require("fs");
const smartweave = require("smartweave");
const {
  createContractExecutionEnvironment
} = require("smartweave/lib/contract-load");
const Arweave = require("arweave");
require("dotenv").config();
const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
  timeout: 20000,
  logging: false
});

const CONTRACT_ID = "";
const MIN_FEE = 0;

const walletPath = process.env.WALLET_LOCATION;
if (!walletPath) throw new Error("WALLET_LOCATION not specified in .env");

const wallet = JSON.parse(fs.readFileSync(walletPath));
const contractSrc = fs.readFileSync(`dist/koi.js`, "utf8");
const stateStr = fs.readFileSync(`src/koi/init_state.json`);
const initState = JSON.parse(stateStr);

const { handler, swGlobal } = createContractExecutionEnvironment(
  arweave,
  contractSrc,
  CONTRACT_ID
);

const contract_info = {
  id: CONTRACT_ID,
  contractSrc,
  initState,
  MIN_FEE,
  undefined,
  handler,
  swGlobal
};

(async () => {
  const transferInput = {
    function: "transfer",
    target: "FeSD9TV8aB0GK0yby8A40KEX1N-3wrJQTDbRW4uUiEA",
    qty: 10
  };
  let state = JSON.parse(stateStr);
  const walletAddress = await arweave.wallets.jwkToAddress(wallet);

  console.log(state);
  state = await interactDryRun(transferInput, state, walletAddress);
  console.log(state);
})();

/**
 * Does a dry run of an interaction with a local contract state and source
 * @param {any} input Interaction input object
 * @param {any} state The starting contract state to be interacted
 * @param {any} from Source address of the interaction
 * @returns Updated state
 */
async function interactDryRun(input, state, from) {
  return (
    await smartweave.interactWriteDryRun(
      arweave,
      wallet,
      CONTRACT_ID,
      input,
      undefined,
      undefined,
      undefined,
      state,
      from,
      contract_info
    )
  ).state;
}
