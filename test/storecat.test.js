const smartest = require("@_koi/smartest");
const Arweave = require("arweave");
const fs = require("fs");
const md5 = require("md5");
const axios = require("axios").default;
const ClusterUtil = require("../src/storecat/cluster");
const ScraperUtil = require("../src/storecat/scraper");

if (process.argv[2] === undefined) throw "Wallet path not defined";

const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
  timeout: 20000,
  logging: false
});

const wallet = JSON.parse(fs.readFileSync(process.argv[2]));
const isTested = false;
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

const test_payload_dong = {
  title: "一个帐号，畅享 Google 所有服务！",
  content: {
    Image: [
      {
        label: "Payload Image0",
        selector: "0$img[class='circle-mask']",
        text: "https://ssl.gstatic.com/accounts/ui/avatar_2x.png",
        type: "Image"
      }
    ],
    Link: [],
    Text: [
      {
        label: "Payload Text0",
        selector: "0$div[class='banner']>h1",
        text: "One account. All of Google.",
        type: "Text"
      }
    ]
  },
  image: "https://ssl.gstatic.com/accounts/ui/avatar_2x.png"
};
const test_payload_yang = {
  title: "一个帐号，畅享 Google 所有服务！",
  content: {
    Image: [
      {
        label: "Payload Image0",
        selector: "0$img[class='circle-mask']",
        text: "https://ssl.gstatic.com/accounts/ui/avatar_2x.png",
        type: "Image"
      }
    ],
    Link: [
      {
        label: "Payload Link0",
        selector: "0$a[class='need-help']",
        text: "https://accounts.google.com/signin/usernamerecovery?continue=https%3A%2F%2Fmail.google.com%2Fmail%2Fu%2F0%2F&service=mail&osid=1&hl=en",
        type: "Link"
      }
    ],
    Text: [
      {
        label: "Payload Text0",
        selector: "0$div[class='banner']>h1",
        text: "One account. All of Google.",
        type: "Text"
      }
    ]
  },
  image: "https://ssl.gstatic.com/accounts/ui/avatar_2x.png"
};
const test_payload = {
  title: "一个帐号，畅享 Google 所有服务！",
  content: {
    Image: [
      {
        label: "Payload Image0",
        selector: "0$img[class='circle-mask']",
        text: "https://ssl.gstatic.com/accounts/ui/avatar_2x.png",
        type: "Image"
      }
    ],
    Link: [
      {
        label: "Payload Link0",
        selector: "0$a[class='need-help']",
        text: "https://accounts.google.com/signin/usernamerecovery?continue=https%3A%2F%2Fmail.google.com%2Fmail%2Fu%2F0%2F&service=mail&osid=1&hl=en",
        type: "Link"
      }
    ],
    Text: [
      {
        label: "Payload Text0",
        selector: "0$div[class='banner']>h1",
        text: "One account. All of Google.",
        type: "Text"
      }
    ]
  },
  image: "https://ssl.gstatic.com/accounts/ui/avatar_2x.png"
};
async function getPayload(url) {
  try {
    let cluster = await ClusterUtil.puppeteerCluster();
    const { html } = await cluster.execute({
      url,
      takeScreenshot: false
    });
    const scrapingData = await ScraperUtil.getPayload(html);
    console.log(
      "**************** finished scraping *******************",
      scrapingData
    );
    return scrapingData;
  } catch (error) {
    console.log("get payload error", error);
    return false;
  }
}
async function test_get_scraping_request() {
  // --- test get scraping request
  let url = "https://app.getstorecat.com:8888/api/v1/bounty/getScrapingUrl";
  const data = await axios.get(url);
  console.log(data);
  // data: {
  //   websiteUrl: 'http://gmail.com',
  //   uuid: 'Bwsx4fw3tEZbSn3iV9OgiSKG',
  //   bounty: 1,
  //   owner: '7ZcchrEyaDZO8v0w3sZ780Y2NlbAWGs2kVXP-z5NBss'
  // }
}
async function test_add_scraping_request(walletAddress) {
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
}
async function test_scraping() {
  // --- scraping test
  const test_website = "http://gmail.com";
  let payload = await getPayload(test_website);
  console.log(payload);
}
async function test_upload_payload_to_arweave(payload) {
  // testing save payload
  const bundle = {
    payloads: payload
  };
  try {
    const myTx = await arweave.createTransaction(
      {
        data: Buffer.from(JSON.stringify(bundle, null, 2), "utf8")
      },
      wallet
    );
    myTx.addTag("created", Math.floor(Date.now() / 1000));
    await arweave.transactions.sign(myTx, wallet);
    const result = await arweave.transactions.post(myTx);
    console.log("response arweave transaction", result);
    if (result.status === 200) {
      // success transaction
      console.log("transactionID", myTx.id);
      // james :  iDr0GbUHga4-Lz20v7ZLzwRpyA6Yaj6kHMCka0dvcwE
      // yang :  JlD0F68kcAds3AejyYMSZ3tTUjEAj-wLS7kId_QOX0E
    } else {
      console.log("error response arweave transaction : ", result);
      return false;
    }
  } catch (error) {
    console.log("error bundleAndExport", error);
    return false;
  }
}
async function test_save_payload(walletAddress, txId, payload) {
  // --- test save payload
  const userPayload = {};
  userPayload.payloadTxId = txId;
  userPayload.hashPayload = md5(payload); // 32byte
  userPayload.owner = walletAddress;
  // console.log(userPayload);
  const scInput_savePayload = {
    function: "savePayload",
    matchIndex: 0,
    payload: userPayload
  };
  await smartest.interactWrite(
    arweave,
    storecatSrc,
    wallet,
    scInput_savePayload,
    smartest.readContractState(storecatContractId),
    walletAddress,
    storecatContractId
  );
}
async function main() {
  const walletAddress = await arweave.wallets.jwkToAddress(wallet);
  const firstState = smartest.readContractState(storecatContractId);
  console.log(firstState.tasks[0].payloads);
  console.log(firstState.tasks[0].hashPayloads);
  if (isTested) {
    await test_get_scraping_request();
    await test_add_scraping_request(walletAddress);
    await test_scraping();
    await test_upload_payload_to_arweave(test_payload);
    // await test_upload_payload_to_arweave(test_payload_yang);
    await test_save_payload(
      walletAddress,
      "iDr0GbUHga4-Lz20v7ZLzwRpyA6Yaj6kHMCka0dvcwE",
      test_payload
    );
    await test_save_payload(
      walletAddress,
      "JlD0F68kcAds3AejyYMSZ3tTUjEAj-wLS7kId_QOX0E",
      test_payload_yang
    );
  } else {
    // it is not tested area
    await test_save_payload(
      walletAddress,
      "iDr0GbUHga4-Lz20v7ZLzwRpyA6Yaj6kHMCka0dvcwE",
      test_payload
    );
    // await test_save_payload(walletAddress, "iDr0GbUHga4-Lz20v7ZLzwRpyA6Yaj6kHMCka0dvcwE", test_payload_dong);
  }
  const latestState = smartest.readContractState(storecatContractId);
  console.log(latestState.tasks[0].payloads);
  console.log(latestState.tasks[0].hashPayloads);

  // console.log(
  //   "Storecat final state:",
  //   smartest.readContractState(storecatContractId)
  // );
}

main().then(() => {
  console.log("Test complete");
});
