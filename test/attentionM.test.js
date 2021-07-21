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

  const attentionInput = {
    function: "submitDistribution",
    distributionTxId: "eo_YY_RAdYkWMYh7-MuBCgd3Dl-iWDIXx-vhfSZGodc",
    cacheUrl: "http/bundler/cache",
    mainContractId: koiContractId,
    contractId: attentionContractId
  };
  await smartest.interactWrite(
    arweave,
    attentionSrc,
    wallet,
    attentionInput,
    smartest.readContractState(attentionContractId),
    walletAddress,
    attentionContractId
  );

  const attentionInput0 = {
    function: "submitDistribution",
    distributionTxId: "KFyrB4SBIv5XPyRu-sBUdfuQlvDpBGQ6-q9ujVek34A",
    cacheUrl: "http/bundler/cache",
    mainContractId: koiContractId,
    contractId: attentionContractId
  };
  await smartest.interactWrite(
    arweave,
    attentionSrc,
    wallet,
    attentionInput0,
    smartest.readContractState(attentionContractId),
    walletAddress,
    attentionContractId
  );

  const state = smartest.readContractState(attentionContractId);
  const proposedPaylods = state.task.proposedPaylods.find(
    (proposedPaylod) => proposedPaylod.block === state.task.open
  );
  const proposedDataId = proposedPaylods.proposedDatas[0].id;
  const attentionInput1 = {
    function: "audit",
    id: proposedDataId,
    descripition: "malicious_data"
  };
  await smartest.interactWrite(
    arweave,
    attentionSrc,
    wallet,
    attentionInput1,
    smartest.readContractState(attentionContractId),
    walletAddress,
    attentionContractId
  );

  const attentionInput2 = {
    function: "vote",
    voteId: proposedDataId,
    userVote: true
  };
  await smartest.interactWrite(
    arweave,
    attentionSrc,
    wallet,
    attentionInput2,
    smartest.readContractState(attentionContractId),
    walletAddress,
    attentionContractId
  );

  const attentionInput3 = {
    function: "rankAndPrepareDistribution"
  };
  await smartest.interactWrite(
    arweave,
    attentionSrc,
    wallet,
    attentionInput3,
    smartest.readContractState(attentionContractId),
    walletAddress,
    attentionContractId
  );

  const koiInput = {
    function: "registerTask",
    taskTxId: attentionContractId,
    taskName: "Attention_Game"
  };
  await smartest.interactWrite(
    arweave,
    koiSrc,
    wallet,
    koiInput,
    smartest.readContractState(koiContractId),
    walletAddress,
    koiContractId
  );

  const koiInput0 = {
    function: "distributeReward"
  };
  await smartest.interactWrite(
    arweave,
    koiSrc,
    wallet,
    koiInput0,
    smartest.readContractState(koiContractId),
    walletAddress,
    koiContractId
  );

  console.log(
    "Koi final state: ",
    smartest.readContractState(koiContractId),
    "Attention final state:",
    smartest.readContractState(attentionContractId)
  );
}

main().then(() => {
  console.log("Test complete");
});
