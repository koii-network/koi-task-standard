const smartest = require("@_koi/smartest");
const Arweave = require("arweave");
const fs = require("fs");
// const axios = require("axios").default;
// const ClusterUtil = require("../src/storecat/cluster");
// const ScraperUtil = require("../src/storecat/scraper");

if (process.argv[2] === undefined) throw "Wallet path not defined";

// async function getPayload(url) {
//   try {
//     let cluster = await ClusterUtil.puppeteerCluster();
//     const { html } = await cluster.execute({
//       url,
//       takeScreenshot: false
//     });
//     const scrapingData = await ScraperUtil.getPayload(html);
//     console.log(
//       "**************** finished scraping *******************",
//       scrapingData
//     );
//     return scrapingData;
//   } catch (error) {
//     console.log("get payload error", error);
//     return false;
//   }
// }

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
  const koiSrc = fs.readFileSync(`dist/koii-core.js`, "utf8");
  const koiContractId = "a1s2d3f4";
  const koiInitState = JSON.parse(
    fs.readFileSync(`src/koii-core/init_state.json`)
  );
  smartest.writeContractState(koiContractId, koiInitState);

  // Load storecat contract
  const storecatSrc = fs.readFileSync(`dist/storecat.js`, "utf8");
  const storecatContractId = "q2w3e5r7";
  const storecatInitState = JSON.parse(
    fs.readFileSync(`src/storecat/init_state_test.json`)
  );
  smartest.writeContractState(storecatContractId, storecatInitState);

  // --- test get scraping request
  // let url = "https://app.getstorecat.com:8888/api/v1/bounty/getScrapingUrl";
  // const data = await axios.get(url);
  // console.log(data);
  // data: {
  //   websiteUrl: 'http://gmail.com',
  //   uuid: 'Bwsx4fw3tEZbSn3iV9OgiSKG',
  //   bounty: 1,
  //   owner: '7ZcchrEyaDZO8v0w3sZ780Y2NlbAWGs2kVXP-z5NBss'
  // }

  // --- test add scraping request
  const scInput_scrapingRequest = {
    function: "addScrapingRequest",
    scrapingRequest: {
      websiteUrl: "http://gmail.com",
      uuid: "Bwsx4fw3tEZbSn3iV9OgiSKG",
      bounty: 1,
      owner: "7ZcchrEyaDZO8v0w3sZ780Y2NlbAWGs2kVXP-z5NBss"
    }
  };
  await smartest.interactWrite(
    arweave,
    storecatSrc,
    wallet,
    scInput_scrapingRequest,
    smartest.readContractState(storecatContractId),
    walletAddress,
    storecatContractId
  );

  // --- scraping test
  // const test_website = "http://gmail.com";
  // let payload = await getPayload(test_website);
  // console.log(payload);

  // const state = smartest.readContractState(storecatContractId);
  // console.log("current state: ", state);

  console.log(smartest.readContractState(storecatContractId));
  console.log(
    "Storecat final state:",
    smartest.readContractState(storecatContractId)
  );
}

main().then(() => {
  console.log("Test complete");
});
