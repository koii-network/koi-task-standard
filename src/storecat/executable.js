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
  res
    .status(200)
    .type("application/json")
    .send("Hello world");
}

/*
  bounty request api
*/
function getTask () {
  let response = 'https://app.getstorecat.com:8888/api/v1/bounty/get'
  return response
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
