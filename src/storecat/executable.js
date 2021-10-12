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

// Import SDK modules if you want to use them (optional)
const Arweave = require("arweave");
const kohaku = require("@_koi/kohaku");
const axios = require("axios");
const crypto = require("crypto");

import ClusterUtil from "./cluster";
import ScraperUtil from "./scraper";

const arweave = Arweave.init({
  host: "arweave.net",
  protocol: "https",
  port: 443,
  timeout: 60000,
  logging: false
});

// Define system constants
const ARWEAVE_RATE_LIMIT = 20000; // Reduce arweave load - 20seconds
const OFFSET_PER_DAY = 720;

let lastBlock = 0;
let lastLogClose = 0;
let hasRewarded = false;
let hasScraped = false;
let hasDistributed = false;
let hasAudited = false;

// You can also access and store files locally
const logsInfo = {
  filename: "history_storecat.log"
};

// Define the setup block - node, external endpoints must be registered here using the namespace.express toolkit
function setup(_init_state) {
  if (namespace.app) {
    namespace.express("get", "/", root);
    namespace.express("get", "/id", getId);
  }
}
async function root(_req, res) {
  res
    .status(200)
    .type("application/json")
    .send(await tools.getState(namespace.taskTxId));
}

function getId(_req, res) {
  res.status(200).send(namespace.taskTxId);
}

// Define the execution block (this will be triggered after setup is complete)
async function execute(_init_state) {
  let state, block;
  for (;;) {
    await rateLimit(); // should check scraping item existing
    try {
      [state, block] = await getStorecatStateAndBlock();
    } catch (e) {
      console.error("Error while fetching attention state and block", e);
      continue;
    }
    try {
      await (namespace.app ? service : witness)(state, block);
    } catch (e) {
      console.error("Error while performing attention task:", e);
    }
  }
}

async function getStorecatStateAndBlock() {
  const state = await tools.getState(namespace.taskTxId);
  let block = await tools.getBlockHeight();
  if (block < lastBlock) block = lastBlock;

  if (!state || !state.task) console.error("State or task invalid:", state);
  const logClose = state.task.close;
  if (logClose > lastLogClose) {
    if (lastLogClose !== 0) {
      console.log("Task updated, resetting trackers");
      hasScraped = false;
      hasAudited = false;
      hasDistributed = false;
      hasRewarded = false;
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
async function service(state, block) {
  if (!canRequestScrapingUrl(state)) await getTask();
  if (!canScrape(state, block)) await scrape();
  if (canAudit(state, block)) await audit(state);
  if (canWritePayloadInPermaweb(state, block)) await writePayloadInPermaweb();
  if (canDistributeReward(state)) await distribute();
}
async function witness(state, block) {
  // if (checkForVote(state, block)) await tryVote(state);
  // if (await checkProposeSlash(state, block)) await proposeSlash(state);
}

/*
  canAudit : is it possible to audit
  return : boolean
*/
function canAudit(state, block) {
  const task = state.task;
  if (block >= task.close) return false;
  if (block < task.open + OFFSET_PER_DAY) {
    // string scraping require
    return false;
  }
  if (hasAudited) return false;

  if (state.payloads && state.payloads.length > 0) {
    return true;
  }
}
/*
  An audit contract can optionally be implemented when using gradual consensus (see https://koii.network/gradual-consensus.pdf for more info)
*/
async function audit(state) {
  const task = state.task;
  const address = tools.address;
  // check payload ranking
  // const input = {
  //   function: "audit",
  //   id: proposedData.txId
  // };
  // const task = "submit audit";
  // const tx = await kohaku.interactWrite(
  //   arweave,
  //   tools.wallet,
  //   namespace.taskTxId,
  //   input
  // );

  // if (await checkTxConfirmation(tx, task))
  //   console.log("audit submitted");
  hasAudited = true;
}

async function writePayloadInPermaweb() {
  console.log("payload submit to arweave");
}

function canDistributeReward() {
  if (hasDistributed) return false;
  return hasScraped && hasAudited;
}

async function distribute(){

}

function canWritePayloadInPermaweb(state, block) {
  if (block < task.open + OFFSET_PER_DAY) return false;
  if (block > task.close) return false;
  return (hasScraped && hasAudited && !hasDistributed);
}

async function canRequestScrapingUrl() {
  return true;
}
/*
  Check owner whether scrape
  @returns boolean
*/
async function canScrape(state, block) {
  const taskIndex = state.tasks.findIndex((t) => !t.isClose);
  if (taskIndex < 0) {
    console.log("There is no task for scraping");
    return false;
  }
  const task = state.tasks[taskIndex];
  // per day is 720 block height
  if (block >= task.close) return false;
  // if current owner already scraped : return true
  const isPayloader = state.payloads.filter((p) => p.owner === tools.address);
  if (isPayloader) return false;
  return true;
}
/*
  bounty request api
  @returns scraping url, bounty, uuid
*/
function getTask(state) {
  // let url = "https://app.getstorecat.com:8888/api/v1/bounty/get";
  let return_url = "https://gmail.com";
  state.task.scraping.uuid = "60d9cf5970d912231cc4a230";
  state.task.scraping.bounty = 1;
  state.task.scraping.url = return_url;
  return true;
}
/*
  scrape : get scraping payload 
  @returns scraping payload, hashpayload
*/
async function scrape(state) {
  let payload = {
    content: {
      Image: [],
      Text: [],
      Link: []
    }
  };
  let hashPayload = "2503e0483fe9bff8e3b18bf4ea1fe23b";
  // let payload = await getPayload(state.task.url)
  // hash = md5(JSON.stringify(scrapingData))
  // state.hashPayload = hash
  const userPayload = {};
  userPayload.payload = payload;
  userPayload.hashPayload = hashPayload;
  userPayload.owner = tools.address;
  state.payloads.push(userPayload);
  hasScraped = true;
  // call interactWrite function
  // updatePayload
  const input = {
    function: "audit",
    id: proposedData.txId
  };
  const tx = await kohaku.interactWrite(
    arweave,
    tools.wallet,
    namespace.taskTxId,
    input
  );
  return true;
}
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
    console.log('get payload error', error);
    return false;
  }
  
}
/**
 * Awaitable rate limit
 * @returns
 */
function rateLimit() {
  return new Promise((resolve) => setTimeout(resolve, ARWEAVE_RATE_LIMIT));
}
