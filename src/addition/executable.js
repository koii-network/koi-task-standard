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
const FOO = "BAR";

// You can also access and store files locally
const logsInfo = {
  filename: "history.log"
};

// Define the setup block - node, external endpoints must be registered here using the namespace.express toolkit
function setup(_init_state) {
  if (namespace.app) {
    namespace.express("get", "/", helloWorld);
    namespace.express("get", "/sum/:first/:second", getSum);
  }
}

/**
 * Awaitable rate limit
 * @returns
 */
 function rateLimit() {
  return new Promise((resolve) => setTimeout(resolve, ARWEAVE_RATE_LIMIT));
}

// Define the execution block (this will be triggered after setup is complete)
async function execute(_init_state) {
  let state, block;
  for (;;) {
    await rateLimit();
    try {
      [nodes] = await getRegisteredNodeList();
      // auditNodes();
    } catch (e) {
      console.error("Error while fetching node list", e);
      continue;
    }
    try {
      await (namespace.app ? service : witness)(state, block);
    } catch (e) {
      console.error("Error while addition task:", e);
    }
  }
}

async function helloWorld(_req, res) {
  res
    .status(200)
    .type("application/json")
    .send("Hello world");
}

async function getSum(_req, res) {
  let sum;
  if (_req.params.first && _req.params.second) {
    sum = _req.params.first + _req.params.second;
  } else {
    sum = [_req.params.first, _req.params.second]
  }
  res
    .status(200)
    .type("application/json")
    .send(sum);
}

async function getRegisteredNodeList () {
  return ["https://localhost:3000"]
}

// /*
//   An audit contract can optionally be implemented when using gradual consensus (see https://koii.network/gradual-consensus.pdf for more info)
// */
// async function auditNodes(state) {
//   hasAudited = true;
// }

// function canAudit(state, block) {
//   const task = state.task;
//   if (block >= task.close) return false;

//   const activeProposedData = task.proposedPayloads.find(
//     (proposedData) => proposedData.block === task.open
//   );

//   const proposedData = activeProposedData.proposedData;

//   return (
//     block < task.open + OFFSET_BATCH_VOTE_SUBMIT && // block in time frame
//     !hasAudited && // ports not submitted
//     proposedData.length !== 0
//   );
// }
