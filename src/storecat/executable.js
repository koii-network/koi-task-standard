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

const arweave = Arweave.init({
  host: "arweave.net",
  protocol: "https",
  port: 443,
  timeout: 60000,
  logging: false
});

// Define system constants
const ARWEAVE_RATE_LIMIT = 20000; // Reduce arweave load - 20seconds
const OFFSET_PER_DAY = 720

let lastBlock = 0;
let lastLogClose = 0;
let hasRewarded = false;
let hasRanked = false;
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
    await rateLimit();
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
      hasRewarded = false;
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
async function service(state, block) {
  // if (!canRequestScrapingUrl(state)) await getTask();
  if (!canScrape(state, block)) await scrape();
  // if (canProposePorts(state, block)) await proposePorts();
  // if (canAudit(state, block)) await audit(state);
  // if (canSubmitBatch(state, block)) await submitBatch(state);
  // if (canRankPrepDistribution(state, block)) await rankPrepDistribution();
  // if (canDistributeReward(state)) await distribute();
}
async function witness(state, block) {
  // if (checkForVote(state, block)) await tryVote(state);
  // if (await checkProposeSlash(state, block)) await proposeSlash(state);
}
/*
  An audit contract can optionally be implemented when using gradual consensus (see https://koii.network/gradual-consensus.pdf for more info)
*/
async function audit(state) {
  const task = state.task;
  const activeProposedData = task.proposedPayloads.find(
    (proposedData) => proposedData.block === task.open
  );
  const address = tools.address;
  const proposedData = activeProposedData.proposedData;
  await Promise.allSettled(
    proposedData.map(async (proposedData) => {
      if (proposedData.distributer !== address) {
        const valid = await auditPort(proposedData.txId, proposedData.cacheUrl);
        if (!valid) {
          const input = {
            function: "audit",
            id: proposedData.txId
          };
          const task = "submit audit";
          const tx = await kohaku.interactWrite(
            arweave,
            tools.wallet,
            namespace.taskTxId,
            input
          );

          if (await checkTxConfirmation(tx, task))
            console.log("audit submitted");
        }
      }
    })
  );
  hasAudited = true;
}
function canAudit(state, block) {
  const task = state.task;
  if (block >= task.close) return false;

  const activeProposedData = task.proposedPayloads.find(
    (proposedData) => proposedData.block === task.open
  );

  const proposedData = activeProposedData.proposedData;

  return (
    block < task.open + OFFSET_BATCH_VOTE_SUBMIT && // block in time frame
    !hasAudited && // ports not submitted
    proposedData.length !== 0
  );
}

async function canRequestScrapingUrl(state, block) {
  const task = state.task;
  // per day is 720 block height
  if (block >= task.close) return false;
  if (
    task.scraping === undefined ||
    task.scraping.uuid === undefined ||
    task.scraping.uuid === ""
  )
    return true;
  else return false;
}
/*
  Check owner whether scrape
  @returns boolean
*/
async function canScrape(state, block) {
  const task = state.task;
  // per day is 720 block height
  if (block >= task.close) return false;
  // if current owner already scraped : return true
  const isPayloader = state.payloads.filter((p) => p.owner === tools.address);
  if (isPayloader) return false;
  return true
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
  const payloads = state.payloads;
  const isPayloader = payloads.filter((p) => p.owner === tools.address);
  if (isPayloader) return false;
  // if scraping false return false 
  let payload = {
    content: {
      Image: [],
      Text: [],
      Link: []
    }
  };
  let hashPayload = "2503e0483fe9bff8e3b18bf4ea1fe23b";
  // const storecatState = await tools.getState(namespace.taskTxId);
  // const payloads = Object.keys(storecatState.payloads);
  const userPayload = {};
  userPayload.payload = payload;
  userPayload.hashPayload = hashPayload;
  userPayload.owner = tools.address;
  state.payloads.push(userPayload);
  return true;
}
function getScrapingRequest() {

}
/**
 * Awaitable rate limit
 * @returns
 */
function rateLimit() {
  return new Promise((resolve) => setTimeout(resolve, ARWEAVE_RATE_LIMIT));
}
