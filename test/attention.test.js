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
  const attentionSrc = fs.readFileSync(`dist/attention.js`, "utf8");
  const attentionContractId = "q5w6e7r8";
  const attentionInitState = JSON.parse(
    fs.readFileSync(`src/attention/init_state.json`)
  );
  smartest.writeContractState(attentionContractId, attentionInitState);

  // Load koii contract
  const taskSrc = fs.readFileSync(`dist/koi_task.js`, "utf8");
  const taskContractId = "f4l5s8n9";
  const taskInitState = JSON.parse(
    fs.readFileSync(`src/koi_task/init_state.json`)
  );
  smartest.writeContractState(taskContractId, taskInitState);

  // const attentionInput = {
  //   function: "batchAction",
  //   batchFile: "rivOhJyE70LVRNjH7jUWGEnMHZw88VZCMkRyslhUrWs",
  //   voteId: "oH2XaHh0vMaJTBraw2USfOwptd3aEfBz2SQRDf5lAyo"
  // };
  // await smartest.interactWrite(
  //   arweave,
  //   attentionSrc,
  //   wallet,
  //   attentionInput,
  //   smartest.readContractState(attentionContractId),
  //   walletAddress,
  //   attentionContractId
  // );

  // const attentionInput0 = {
  //   function: "submitDistribution",
  //   distributionTxId: "KFyrB4SBIv5XPyRu-sBUdfuQlvDpBGQ6-q9ujVek34A",
  //   cacheUrl: "http/bundler/cache",
  //   mainContractId: koiContractId,
  //   contractId: attentionContractId
  // };
  // await smartest.interactWrite(
  //   arweave,
  //   attentionSrc,
  //   wallet,
  //   attentionInput0,
  //   smartest.readContractState(attentionContractId),
  //   walletAddress,
  //   attentionContractId
  // );

  // const state = smartest.readContractState(attentionContractId);
  // const proposedPaylods = state.task.proposedPaylods.find(
  //   (proposedPaylod) => proposedPaylod.block === state.task.open
  // );
  // const proposedDataId = proposedPaylods.proposedDatas[0].id;
  // const attentionInput1 = {
  //   function: "audit",
  //   id: proposedDataId,
  //   descripition: "malicious_data"
  // };
  // await smartest.interactWrite(
  //   arweave,
  //   attentionSrc,
  //   wallet,
  //   attentionInput1,
  //   smartest.readContractState(attentionContractId),
  //   walletAddress,
  //   attentionContractId
  // );

  // const attentionInput2 = {
  //   function: "vote",
  //   voteId: proposedDataId,
  //   userVote: true
  // };
  // await smartest.interactWrite(
  //   arweave,
  //   attentionSrc,
  //   wallet,
  //   attentionInput2,
  //   smartest.readContractState(attentionContractId),
  //   walletAddress,
  //   attentionContractId
  // );

  const attentionInput3 = {
    function: "rankPrepDistribution"
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
  // const t1 = new Date();
  // const attentionInput3 = {
  //   function: "cleanInvalidTransactions"
  // };
  // await smartest.interactWrite(
  //   arweave,
  //   attentionSrc,
  //   wallet,
  //   attentionInput3,
  //   smartest.readContractState(attentionContractId),
  //   walletAddress,
  //   attentionContractId
  // );

  // const koiInput = {
  //   function: "registerTask",
  //   taskTxId: taskContractId,
  //   taskName: "Store_Cat"
  // };
  // await smartest.interactWrite(
  //   arweave,
  //   koiSrc,
  //   wallet,
  //   koiInput,
  //   smartest.readContractState(koiContractId),
  //   walletAddress,
  //   koiContractId
  // );

  // const koiInput0 = {
  //   function: "distributeReward"
  // };
  // await smartest.interactWrite(
  //   arweave,
  //   koiSrc,
  //   wallet,
  //   koiInput0,
  //   smartest.readContractState(koiContractId),
  //   walletAddress,
  //   koiContractId
  // );
  // const koiInput0 = {
  //   function: "stake",
  //   qty: 100
  // };
  // await smartest.interactWrite(
  //   arweave,
  //   koiSrc,
  //   wallet,
  //   koiInput0,
  //   smartest.readContractState(koiContractId),
  //   walletAddress,
  //   koiContractId
  // );

  // const koiInput0 = {
  //   function: "withdraw",
  //   qty: 100
  // };
  // await smartest.interactWrite(
  //   arweave,
  //   koiSrc,
  //   wallet,
  //   koiInput0,
  //   smartest.readContractState(koiContractId),
  //   walletAddress,
  //   koiContractId
  // );
  // const koiInput0 = {
  //   function: "burnKoi",
  //   contractId: attentionContractId,
  //   contentType: "nft",
  //   contentTxId: "KXFrIJ1828MpW8IKsuruH2r5Vp-nBKyX25uXLFdzOq0"
  // };
  // await smartest.interactWrite(
  //   arweave,
  //   koiSrc,
  //   wallet,
  //   koiInput0,
  //   smartest.readContractState(koiContractId),
  //   walletAddress,
  //   koiContractId
  // );
  //const t1 = new Date();
  // const attentionInput3 = {
  //   function: "migratePreRegister"
  // };
  // await smartest.interactWrite(
  //   arweave,
  //   attentionSrc,
  //   wallet,
  //   attentionInput3,
  //   smartest.readContractState(attentionContractId),
  //   walletAddress,
  //   attentionContractId
  // );
  // const koiInput2 = {
  //   function: "cleanPreRegister"
  // };
  // await smartest.interactWrite(
  //   arweave,
  //   koiSrc,
  //   wallet,
  //   koiInput2,
  //   smartest.readContractState(koiContractId),
  //   walletAddress,
  //   koiContractId
  // );

  // console.log(
  //   // "Koi final state: ",
  //   // smartest.readContractState(koiContractId)
  //   // "Attention final state:",
  //   // smartest.readContractState(attentionContractId)
  // );

  const state = smartest.readContractState(attentionContractId);
  //const t2 = new Date();
  // const koiState = smartest.readContractState(koiContractId);
  // console.log(koiState.preRegisterDatas);
  //console.log(`Done in ${t2 - t1}ms`);
  console.log(state.task);
}

main().then(() => {
  console.log("Test complete");
});
