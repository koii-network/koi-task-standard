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

// You can also access and store files locally
const logsInfo = {
  filename: "history.log"
};

// Define the setup block - node, external endpoints must be registered here using the namespace.express toolkit
function setup(_init_state) {
  if (namespace.app) {
    namespace.express("get", "/", someMethod);
  }
}

// Define the execution block (this will be triggered after setup is complete)
async function execute(_init_state) {
  let state, block;
  for (;;) {
    await rateLimit();
    try {
      [state, block] = await getAttentionStateAndBlock();
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

async function someMethod(_req, res) {
  res.status(200).type("application/json").send("Hello world");
}

/*
  bounty request api
*/
function getTask() {
  let response = "https://app.getstorecat.com:8888/api/v1/bounty/get";
  return response;
}
async function getAttentionStateAndBlock() {
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

      for (const nftId in nftStateMapCache)
        nftStateMapCache[nftId].updatedAttention = false;
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
  // if (canProposePorts(state, block)) await proposePorts();
  // if (canAudit(state, block)) await audit(state);
  // if (canSubmitBatch(state, block)) await submitBatch(state);
  // if (canRankPrepDistribution(state, block)) await rankPrepDistribution();
  // if (canDistributeReward(state)) await distribute();
}
async function witness(state, block) {
  if (checkForVote(state, block)) await tryVote(state);
  if (await checkProposeSlash(state, block)) await proposeSlash(state);
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

/**
 * Awaitable rate limit
 * @returns
 */
function rateLimit() {
  return new Promise((resolve) => setTimeout(resolve, ARWEAVE_RATE_LIMIT));
}