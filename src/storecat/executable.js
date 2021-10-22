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

// You can also access and store files locally
// const logsInfo = {
//   filename: "history_storecat.log"
// };

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
  if (!canScrape(state, block)) await scrape(state);
  if (canAudit(state, block)) await audit(state, block);
  if (canWritePayloadInPermaweb(state, block)) await writePayloadInPermaweb();
  if (canDistributeReward(state)) await distribute();
}
async function witness(state, block) {
  // if (checkForVote(state, block)) await tryVote(state);
  // if (await checkProposeSlash(state, block)) await proposeSlash(state);
}

/**
 *
 * @param {string} txId // Transaction ID
 * @param {*} task
 * @returns {bool} Whether transaction was found (true) or timedout (false)
 */
 async function checkTxConfirmation(txId, task) {
  const MS_TO_MIN = 60000;
  const TIMEOUT_TX = 60 * MS_TO_MIN;

  const start = new Date().getTime() - 1;
  const update_period = MS_TO_MIN * 5;
  const timeout = start + TIMEOUT_TX;
  let next_update = start + update_period;
  console.log(`Waiting for "${task}" TX to be mined`);
  for (;;) {
    const now = new Date().getTime();
    const elapsed_mins = Math.round((now - start) / MS_TO_MIN);
    if (now > timeout) {
      console.log(`${task}" timed out after waiting ${elapsed_mins}m`);
      return false;
    }
    if (now > next_update) {
      next_update = now + update_period;
      console.log(`${elapsed_mins}m waiting for "${task}" TX to be mined `);
    }
    try {
      await tools.getTransaction(txId);
      console.log(`Transaction found in ${elapsed_mins}m`);
      return true;
    } catch (e) {
      if (e.type === "TX_FAILED") {
        console.error(e.type, "while checking tx confirmation");
        return false;
      }
    }
    await rateLimit();
  }
}

/*
  canAudit : is it possible to audit
  return : boolean
*/

function canAudit(state, block) {
  const taskIndex = state.tasks.findIndex((t) => !t.isReward);
  if (taskIndex < 0) return false;
  const task = state.tasks[taskIndex];
  if (block >= task.close) return false;
  if (block < task.open + OFFSET_PER_DAY) {
    // string scraping require
    return false;
  }
  if (state.payloads && state.payloads.length > 0) {
    return true;
  }
  return false;
}
/*
  An audit contract can optionally be implemented when using gradual consensus (see https://koii.network/gradual-consensus.pdf for more info)
*/
async function audit(state) {
  const taskIndex = state.tasks.findIndex((t) => !t.isReward);
  if (taskIndex < 0) return false;
  // check payload ranking
  const input = {
    function: "audit",
    id: proposedData.txId
  };
  const task_name = "submit audit";
  const tx = await kohaku.interactWrite(
    arweave,
    tools.wallet,
    namespace.taskTxId,
    input
  );

  await checkTxConfirmation(tx, task_name);
  // can't be called koii main task

  await checkTxConfirmation(tx, task_name);
  //   console.log("audit submitted");
  return hasAudited = true;
}

async function writePayloadInPermaweb() {
  console.log("payload submit to arweave");
}

function canDistributeReward(state) {

  const prepareDistribution = state.task.prepareDistribution;
  // check if there is not rewarded distributions
  const unrewardedDistribution = prepareDistribution.filter(
    (distribution) => !distribution.isRewarded
  );
  return unrewardedDistribution.length !== 0;
}

async function distribute() {
  const input = {
    function: "distributeReward"
  };
  const tx = await kohaku.interactWrite(
    arweave,
    tools.wallet,
    tools.contractId, // it is main contract id
    input
  );
  const task = "distributing reward to main contract";
  if (await checkTxConfirmation(tx, task)) {
    hasDistributed = true;
    console.log("Distributed");
  }
}

async function bundleAndExport(data) {
  const myTx = await arweave.createTransaction(
    {
      data: Buffer.from(JSON.stringify(data, null, 2), "utf8")
    },
    tools.wallet
  );

  myTx.addTag('owner', data.owner);
  myTx.addTag('task', 'storecat');
  myTx.addTag('url', data.url);
  myTx.addTag('created', Math.floor(Date.now() / 1000));
  await arweave.transactions.sign(myTx, tools.wallet);
  const result = await arweave.transactions.post(myTx);
  console.log("response arweave transaction" , result)
  if (result.status === 200) {
    // success transaction
    return myTx.id;
  } else {
    console.log("error response arweave transaction : " , result, data.uuid)
    return false;
  }
  // result.id = myTx.id;
  // return result;
}

async function canWritePayloadInPermaweb(state, block) {
  const tasks = state.tasks;

  if(tasks.length == 0) return false;
  
  let matchIndex = -1;
  for (let index = 0; index < tasks.length; index++) {
    const element = tasks[index];
    if (block >= element.close && element.hasAudit && element.payloads.length > 0) {
      matchIndex = index;
      break;
    }
  }
  if(matchIndex === -1) {
    return false;
  }
  const task = tasks[matchIndex];
  const bundle = {
    owner: task.owner,
    uuid: task.uuid,
    url: task.url,
    payloads: topPayload // it should be changed with top Payload
  }
  const tId = await bundleAndExport(bundle);
  if(tId) {
    // update state 
    return true;
  }
  return false;
}

function canRequestScrapingUrl() {
  return true;
}
/*
  Check owner whether scrape
  @returns boolean
*/
function canScrape(state, block) {
  const taskIndex = state.tasks.findIndex((t) => !t.isReward);
  if (taskIndex < 0) {
    console.log("There is no task for scraping");
    return false;
  }
  const task = state.tasks[taskIndex];
  // per day is 720 block height
  if (block >= task.close) return false;
  // if current owner already scraped : return true
  const isPayloader = task.payloads.filter((p) => p.owner === tools.address);
  if (isPayloader) return false;
  return true;
}
/*
  bounty request api
  @returns scraping url, bounty, uuid
*/
async function getTask(state) {
  let url = "https://app.getstorecat.com:8888/api/v1/bounty/get";
  const data = await fetch(url);
  console.log(data);

  // let return_url = "https://gmail.com";
  // state.task.scraping.uuid = "60d9cf5970d912231cc4a230";
  // state.task.scraping.bounty = 1;
  // state.task.scraping.url = return_url;
  // state.task.scraping.owner = 'ownerAddress';

  // check the owner has some koii

  const input = {
    function: "addScrapingRequest",
    scrapingRequest: data
  };
  const task_name = "add scraping request";
  const tx = await kohaku.interactWrite(
    arweave,
    tools.wallet,
    namespace.taskTxId,
    input
  );
  await checkTxConfirmation(tx, task_name);

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
