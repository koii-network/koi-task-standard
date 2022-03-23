/* eslint-disable no-undef */
/*
Available APIs:

tools
require
namespace {
  redisGet()
  redisSet()
  fs()
  express()
}
*/

const Arweave = require("arweave");
const fetch = require("node-fetch");
const smartest = require("@_koi/smartest");
const kohaku = require("@_koi/kohaku");
const axios = require("axios");
const crypto = require("crypto");

const arweave = Arweave.init({
  host: "arweave.net",
  protocol: "https",
  port: 443,
  timeout: 10000,
  logging: false
});

// const imageSrc = namespace.fs("readFile", "./image_contract.js", "utf8");
// const imageContractId = "a1s2d3f45";
// const imageInitState = JSON.parse(
//   namespace.fs("readFile", "./init_state_image.json", "utf8")
// );
// smartest.writeContractState(imageContractId, imageInitState);

let lastBlock = 0;
let lastLogClose = 0;

const REDIS_KEY = process.env["SERVICE_URL"];
const ARWEAVE_RATE_LIMIT = 60000;

let hasSubmittedPorts = false;
let hasProposedSlash = false;
let hasRanked = false;
let hasDistributed = false;
let hasVoted = false;
let hasSubmitBatch = false;
let hasAudited = false;
let portFlag = true;
let waiting = [];

const logsInfo = {
  currentRedisPortsKey: `${REDIS_KEY}++ports`,
  lockedRedisPortsKey: `${REDIS_KEY}++lockedPorts`,
  currentChunkCount: `${REDIS_KEY}++currentChunkCount`,
  lockedChunkCount: `${REDIS_KEY}++lockedChunkCount`,
  currentChunk: `${REDIS_KEY}++currentChunk-`,
  lockedChunk: `${REDIS_KEY}++lockedChunk-`
};

function rateLimit() {
  return new Promise((resolve) => setTimeout(resolve, ARWEAVE_RATE_LIMIT));
}

async function execute(_init_state) {
  let state, block;
  for (;;) {
    await rateLimit();
    try {
      [state, block] = await getIpfsStateAndBlock();
    } catch (e) {
      console.error("Error while fetching ipfs state and block", e);
    }
  }
}

async function getDataBlob(imageUrl) {
  var res = await fetch(imageUrl);
  var blob = await res.blob();
  var obj = {};
  obj.contentType = blob.type;

  var buffer = await blob.arrayBuffer();
  obj.data = buffer;

  return obj;
}

async function acceptNft(req, res) {
  try {
    const cid = req.body.cid;
    const wallet = tools.wallet;
    const walletAddress = req.body.walletAddress;
    const title = req.body.title;
    const name = req.body.name;
    const description = req.body.description;
    const url = "https://ipfs.io/ipfs/" + cid;
    console.log("IMAGEURL", url);
    let imageOBJ = await getDataBlob(
      url // paste your image url here
    );
    const initialState = {
      title: title,
      name: name,
      description: description,
      ticker: "KOINFT",
      balances: {
        walletAddress: 1
      },
      owners: {
        1: JSON.stringify(walletAddress)
      },
      maxSupply: 5,
      locked: [],
      contentType: "image/png",
      createdAt: Date.now,
      tags: [""]
    };
    let tx;
    try {
      tx = await arweave.createTransaction(
        {
          data: imageOBJ.data
        },
        wallet
      );
    } catch (err) {
      console.log("create transaction error");
      console.log("err-transaction", err);
      return false;
    }
    tx.addTag("Content-Type", imageOBJ.contentType);
    tx.addTag("Network", "Raj");
    tx.addTag("Action", "marketplace/Create");
    tx.addTag("App-Name", "SmartWeaveContract");
    tx.addTag("App-Version", "0.3.0");
    tx.addTag("Contract-Src", "r_ibeOTHJW8McJvivPJjHxjMwkYfAKRjs-LjAeaBcLc");
    tx.addTag("Init-State", JSON.stringify(initialState));
    try {
      await arweave.transactions.sign(tx, wallet);
    } catch (err) {
      console.log("transaction sign error");
      console.log("err-sign", err);
      return false;
    }
    try {
      // console.log(" wallet : ", wallet);
      console.log("TX", tx.id);
      let uploader = await arweave.transactions.getUploader(tx);
      console.log("uploder", uploader);
      while (!uploader.isComplete) {
        await uploader.uploadChunk();
        console.log(
          uploader.pctComplete + "% complete",
          uploader.uploadedChunks + "/" + uploader.totalChunks
        );
      }
      return res.status(200).send({ ID: tx.id });
    } catch (err) {
      console.log("err-last", err);
      return false;
    }
    // testing update contract
    // const upload_input = {
    //   function: "upload",
    //   hash: cid
    // };
    // const upload_id = await smartest.interactWrite(
    //   arweave,
    //   imageSrc,
    //   wallet,
    //   upload_input,
    //   smartest.readContractState(imageContractId),
    //   walletAddress,
    //   imageContractId
    // );
    // console.log(smartest.readContractState(imageContractId));
    // res.status(200).send({ Result: "Request recorded" });
    // This is contract interaction after the real task deployment
    // const input = {
    //   function: "upload",
    //   hash: cid
    // };
    // const resultTx = await kohaku.interactWrite(
    //   arweave,
    //   tools.wallet,
    //   namespace.taskTxId,
    //   input
    // );
    // task = "accept NFT";
    // if (!(await checkTxConfirmation(resultTx, task))) {
    //   console.log("Batch failed");
    //   return;
    // }
  } catch (error) {
    console.log("error in running Cid API", error);
    res.status(404).send({ error: "ERROR: " + error });
  }
  // const cid = req.body.cid;
  // return res.status(200).send({ Result: `Request recorded` });
}

async function setupPorts() {
  currentChunkCount = await namespace.redisGet(logsInfo.currentChunkCount);
  console.log(`current Count redis`, currentChunkCount);
  if (!currentChunkCount) {
    currentChunkCount = 1;
    await namespace.redisSet(logsInfo.currentChunkCount, currentChunkCount);
    return;
  }
  // await namespace.redisSet(logsInfo.currentChunkCount, currentChunkCount);
  let currentChunkStr = await namespace.redisGet(
    logsInfo.currentChunk + currentChunkCount
  );

  currentChunk = JSON.parse(currentChunkStr);
  // console.log(currentChunk);
  if (!currentChunk) currentChunk = [];
}

function setup(_init_state) {
  if (namespace.app) {
    namespace.express("post", "/cid", acceptNft);
    // namespace.express("get", "/lock", proposePorts); // temp

    // initializePorts();
    setupPorts();
  }
}

async function getIpfsStateAndBlock() {
  const state = await tools.getState(namespace.taskTxId);
  let block = await tools.getBlockHeight();
  if (block < lastBlock) block = lastBlock;

  if (!state || !state.task) console.error("State or task invalid:", state);
  const logClose = state.task.close;
  if (logClose > lastLogClose) {
    if (lastLogClose !== 0) {
      console.log("Task updated, resetting trackers");
      hasSubmittedPorts = false;
      hasProposedSlash = false;
      hasRanked = false;
      hasDistributed = false;
      hasAudited = false;
    }

    lastLogClose = logClose;
  }

  if (block > lastBlock)
    console.log(
      block,
      "Searching for a task, ranking and prepare distribution in",
      logClose - block,
      "blocks"
    );
  lastBlock = block;
  return [state, block];
}
