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

const { fsConstants } = require("fs");
const Arweave = require("arweave");
const arweave = Arweave.init({
  host: "arweave.net",
  protocol: "https",
  port: 443
});

const RESPONSE_ACTION_FAILED = 411;

const OFFSET_SUBMIT_END = 300;
const OFFSET_BATCH_SUBMIT = 470;
const OFFSET_PROPOSE_SLASH = 570;
const OFFSET_RANK = 645;

const URL_GATEWAY_LOGS = "http://gateway.koi.rocks/logs";

const MS_TO_MIN = 60000;
const TIMEOUT_TX = 30 * MS_TO_MIN;

var lastBlock = 0;
var lastLogClose = 0;
var isDistributed = false;
var isLogsSubmitted = false;
var isRanked = false;

const logsInfo = {
  "filename":getTodayDateAsString(),
  "oldFileName":getYesterdayDateAsString()
}

function setup(_init_state) {
  console.log(namespace.express)
  if (namespace.app) namespace.express("post", "/submit-vote", submitVote);
  if (namespace.app) namespace.express("post", "/submit-port", submitPort);

}

async function execute(_init_state) {
  await (namespace.app ? service() : witness());
}

async function service() {
  let state, block;
  for (;;) {
    try {
      [state, block] = await getStateAndBlock();
    } catch (e) {
      console.error(e.message);
      continue;
    }

    if (canSubmitTrafficLog(state, block)) await submitTrafficLog();
    if (canSubmitBatch(state, block)) await submitBatch(state);
    if (canRankProposal(state, block)) await rankProposal();
    if (canDistribute(state, block)) await distribute();
  }
}

async function witness() {
  let state, block;
  for (;;) {
    try {
      [state, block] = await getStateAndBlock();
    } catch (e) {
      console.error(e.message);
      continue;
    }

    if (checkForVote(state, block)) await tryVote(state);
    if (checkProposeSlash(state, block)) await tools.proposeSlash();
  }
}

/**
 * Accepts Port traffic logs
 * @param {*} fileName express.js request
 */
 async function PublishPoRT() {
  let portLogs = await readRawLogs();
  let nftArray=[]
  let attentionArray=[]
  let finalLogs = {}
  for(let i=0;i<portLogs.length;i++){
    const e = portLogs[i]
    let keys = Object.keys(finalLogs);
    if(keys.find(e["trxId"])){
      finalLogs[e["trxId"]].push(e["waller"])
    }else {
      finalLogs["trxId"] = [e["wallet"]];
    }
  }
}

async function readRawLogs() {
  return new Promise(async(resolve, reject) => {
    let fullLogs = await fs("readFile", logInfo.filename);
    let logs = fullLogs.toString().split("\n");
    // console.log('logs are', logs)
    var prettyLogs = [];
    for (var log of logs) {
      // console.log('log is', log)
      try {
        if (log && !(log === " ") && !(log === "")) {
          try {
            var logJSON = JSON.parse(log);
            prettyLogs.push(logJSON);
          } catch (err) {
            // console.error('error reading json in Koi log middleware', err)
            // reject(err)
          }
        }
      } catch (err) {
        // console.error('err', err)
        // reject(err)
      }
    }
    // console.log('resolving some prettyLogs ('+ prettyLogs.length +') sample:', prettyLogs[prettyLogs.length - 1])
    resolve(prettyLogs);
  });
}

function getTodayDateAsString() {
  let date = new Date();
  let year = new Intl.DateTimeFormat("en", { year: "numeric" }).format(date);
  let month = new Intl.DateTimeFormat("en", { month: "short" }).format(date);
  let day = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(date);
  return `${day}-${month}-${year}`;
}
function getYesterdayDateAsString() {
  let date = new Date();
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1)
  let year = new Intl.DateTimeFormat("en", { year: "numeric" }).format(yesterday);
  let month = new Intl.DateTimeFormat("en", { month: "short" }).format(yesterday);
  let day = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(yesterday);
  return `${day}-${month}-${year}`;
}
async function submitPort(req, res) {
  try {
    const signature = _req.body["x-request-signature"];
    const publicKey = _req.body["request-public-key"];

    if (signature) {
      let dataAndSignature = JSON.parse(signature);
      console.log(typeof dataAndSignature);
      let valid = await tools.verifySignature({
        ...dataAndSignature,
        owner: publicKey
      });
      if (!valid) {
        console.log("Signature verification failed");
      }
      console.log(valid);
      let signatureHash = await arweave.crypto.hash(
        Buffer.from(JSON.stringify(dataAndSignature.signature))
      );
      signatureHash = signatureHash.toString("hex");

      if (!difficultyFunction(signatureHash)) {
        console.log("Signature hash incorrect");
      }

      let data = dataAndSignature.data;
      var payload = {
        date: new Date(),
        timestamp: data.timestamp,
        trxId: data.resourceId,
        wallet: await arweave.wallets.ownerToAddress(dataAndSignature["request-public-key"]), //generate from public modulo
        proof: {
          signature: dataAndSignature["x-request-signature"], //req.headers['x-request-signature'],
          public_key: dataAndSignature["request-public-key"] //req.headers['request-public-key'],
        }
      };
      let fileName = getTodayDateAsString();
      fs("appendFile", filename, JSON.stringify(payload));

      res.status(200).json({
        message: "Port Received"
      });
    }
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: "ERROR: " + e });
  }
}
async function getStateAndBlock() {
  const state = await tools.getContractState(); //await smartweave.readContract(namespace.taskTxId);
  let block = await tools.getBlockHeight();
  if (block < lastBlock) block = lastBlock;

  const logClose = state.stateUpdate.trafficLogs.close;
  if (logClose > lastLogClose) {
    if (lastLogClose !== 0) {
      console.log("Logs updated, resetting trackers");
      isDistributed = false;
      isLogsSubmitted = false;
      isRanked = false;
    }

    lastLogClose = logClose;
  }

  if (block > lastBlock)
    console.log(
      block,
      "Searching for a task, distribution in",
      logClose - block,
      "blocks"
    );
  lastBlock = block;

  return [state, block];
}

/**
 *
 * @param {string} txId // Transaction ID
 * @param {*} task
 * @returns {bool} Whether transaction was found (true) or timedout (false)
 */
async function checkTxConfirmation(txId, task) {
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
    } catch (_err) {
      // Silently catch error, might be dangerous
    }
  }
}

function canSubmitTrafficLog(state, block) {
  const trafficLogs = state.stateUpdate.trafficLogs;
  if (
    block >= trafficLogs.open + OFFSET_SUBMIT_END || // block too late or
    isLogsSubmitted // logs already submitted
  )
    return false;

  // Check that our log isn't on the state yet and that our gateway hasn't been submitted yet
  const currentTrafficLogs = state.stateUpdate.trafficLogs.dailyTrafficLog.find(
    (log) => log.block === trafficLogs.open
  );
  const proposedLogs = currentTrafficLogs.proposedLogs;
  const matchingLog = proposedLogs.find(
    (log) => log.owner === tools.address || log.gateWayId === URL_GATEWAY_LOGS
  );
  isLogsSubmitted = matchingLog !== undefined;
  return !isLogsSubmitted;
}

async function submitTrafficLog() {
  var task = "submitting traffic log";
  let arg = {
    gateWayUrl: URL_GATEWAY_LOGS,
    stakeAmount: 2
  };

  let tx = await tools.submitTrafficLog(arg);
  if (await checkTxConfirmation(tx, task)) {
    isLogsSubmitted = true;
    console.log("Logs submitted");
  }
}

function canSubmitBatch(state, block) {
  const trafficLogs = state.stateUpdate.trafficLogs;
  return (
    trafficLogs.open + OFFSET_BATCH_SUBMIT < block &&
    block < trafficLogs.open + OFFSET_PROPOSE_SLASH
  );
}

async function submitBatch(state) {
  const activeVotes = await activeVoteId(state);
  let task = "submitting votes";
  while (activeVotes.length > 0) {
    const voteId = activeVotes[activeVotes.length - 1];
    const state = await tools.getContractState();
    const bundlers = state.votes[voteId].bundlers;
    const bundlerAddress = await tools.getWalletAddress();
    if (!(bundlerAddress in bundlers)) {
      const txId = (await batchUpdateContractState(voteId)).id;
      if (!(await checkTxConfirmation(txId, task))) {
        console.log("Vote submission failed");
        return;
      }
      const arg = {
        batchFile: txId,
        voteId: voteId,
        bundlerAddress: bundlerAddress
      };
      const resultTx = await tools.batchAction(arg);
      task = "batch";
      if (!(await checkTxConfirmation(resultTx, task))) {
        console.log("Batch failed");
        return;
      }
      activeVotes.pop();
    }
    activeVotes.pop();
  }
}

async function activeVoteId(state) {
  // Check if votes are tracked simultaneously
  const votes = state.votes;
  const areVotesTrackedProms = votes.map((vote) => isVoteTracked(vote.id));
  const areVotesTracked = await Promise.all(areVotesTrackedProms);

  // Get active votes
  const close = state.stateUpdate.trafficLogs.close;
  const activeVotes = [];
  for (let i = 0; i < votes.length; i++)
    if (votes[i].end === close && areVotesTracked[i])
      activeVotes.push(votes[i].id);
  return activeVotes;
}

/**
 * Checks if vote file is present to verify it exists
 * @param {*} voteId
 * @returns {boolean} Whether vote exists
 */
async function isVoteTracked(voteId) {
  const batchFileName = "/../app/bundles/" + voteId;
  try {
    await fs("access", batchFileName, fsConstants.F_OK);
    return true;
  } catch (_e) {
    return false;
  }
}

async function batchUpdateContractState(voteId) {
  const batchStr = await getVotesFile(voteId);
  const batch = batchStr.split("\r\n").map(JSON.parse);
  return await bundleAndExport(batch);
}

/**
 *
 * @param {*} fileId ID of vote file to read
 * @returns {string} Vote file contents in utf8
 */
async function getVotesFile(fileId) {
  const batchFileName = "/../bundles/" + fileId;
  await fs("access", batchFileName, fsConstants.F_OK);
  return await fs("readFile", batchFileName, "utf8");
}

/**
 *
 * @param {*} bundle
 * @returns
 */
async function bundleAndExport(bundle) {
  let myTx = await arweave.createTransaction(
    {
      data: Buffer.from(JSON.stringify(bundle, null, 2), "utf8")
    },
    tools.wallet
  );

  await arweave.transactions.sign(myTx, tools.wallet);
  const result = await arweave.transactions.post(myTx);
  result.id = myTx.id;
  return result;
}

/**
 * Checks wether proposal is ranked or not
 * @param {*} state Current contract state data
 * @param {number} block Block height
 * @returns {boolean} Wether we can rank
 */
function canRankProposal(state, block) {
  const trafficLogs = state.stateUpdate.trafficLogs;
  if (
    block < trafficLogs.open + OFFSET_RANK || // if too early to rank or
    trafficLogs.close < block || // too late to rank or
    isRanked // already ranked
  )
    return false;

  // If our rank isn't on the state yet
  if (!trafficLogs.dailyTrafficLog.length) return false;
  const currentTrafficLogs = trafficLogs.dailyTrafficLog.find(
    (trafficLog) => trafficLog.block === trafficLogs.open
  );
  isRanked = currentTrafficLogs.isRanked;
  return !currentTrafficLogs.isRanked;
}

/**
 *
 */
async function rankProposal() {
  const task = "ranking reward";
  const tx = await tools.rankProposal();
  if (await checkTxConfirmation(tx, task)) {
    isRanked = true;
    console.log("Ranked");
  }
}

/**
 *
 * @param {*} state Current contract state data
 * @param {number} block Block height
 * @returns {boolean} Wether we can distribute
 */
function canDistribute(state, block) {
  const trafficLogs = state.stateUpdate.trafficLogs;
  if (
    block < trafficLogs.close || // not time to distribute or
    isDistributed || // we've already distributed or
    !trafficLogs.dailyTrafficLog.length // daily traffic log is empty
  )
    return false;

  // If our distribution isn't on the state yet
  const currentTrafficLogs = trafficLogs.dailyTrafficLog.find(
    (trafficLog) => trafficLog.block === trafficLogs.open
  );
  isDistributed = currentTrafficLogs.isDistributed;
  return !isDistributed;
}

/**
 *
 */
async function distribute() {
  const task = "distributing reward";
  const tx = await tools.distributeDailyRewards();
  if (await checkTxConfirmation(tx, task)) {
    isDistributed = true;
    console.log("Distributed");
  }
}

/**
 * Checks if voting is available
 * @param {*} state Contract state data
 * @param {number} block Current block height
 * @returns {boolean} Whether voting is possible
 */
function checkForVote(state, block) {
  const trafficLogs = state.stateUpdate.trafficLogs;
  return block < trafficLogs.open + OFFSET_BATCH_SUBMIT;
}

/**
 * Tries to vote
 * @param {*} state Current contract state data
 */
async function tryVote(state) {
  while (tools.totalVoted < state.votes.length - 1) {
    const id = tools.totalVoted;
    const voteId = id + 1;
    const payload = {
      voteId,
      direct: this.direct
    };
    const { message } = await tools.vote(payload);
    console.log(`VoteId ${voteId}: ${message}`);
  }
}

/**
 *
 * @param {*} state
 * @param {number} block Current block height
 * @returns {boolean} If can slash
 */
function checkProposeSlash(state, block) {
  const trafficLogs = state.stateUpdate.trafficLogs;
  return (
    trafficLogs.open + OFFSET_PROPOSE_SLASH < block &&
    block < trafficLogs.open + OFFSET_RANK
  );
}

// ############ Setup code below ###########

/**
 * req.body.vote : {
 *   address : < valid arweave address with active state >,
 *   value : < boolean 'true' or 'false' vote >,
 *   vote_id : < a valid ID for a vote taking place on the KOI contract >,
 *   signature : < valid signature matching the address and value above >
 * }
 * @param {*} req express.js request
 * @param {*} res express.js result object
 * @returns
 */
async function submitVote(req, res) {
  const submission = req.body;
  if (
    !submission.vote ||
    !submission.senderAddress ||
    !submission.vote.userVote ||
    !submission.signature
  ) {
    return res.status(RESPONSE_ACTION_FAILED).json({
      message: "Invalid vote format"
    });
  }

  const receipt = await checkVote(submission);

  return receipt.accepted
    ? res.json({
        message: "success",
        receipt: receipt
      })
    : res.status(RESPONSE_ACTION_FAILED).json({
        message: "Invalid signature or insufficient stake."
      });
}

/**
 * Check the vote's signature
 * @param {*} payload
 * @returns
 */
async function checkVote(payload) {
  // add && tools.verifyStake(vote.address)
  if (!(await tools.verifySignature(payload))) return { accepted: false };
  const receipt = await appendToBatch(payload); // Since it's valid, append it to the vote list

  // NOTE: we piggy back the receipt on this function because
  //   this ensures that the receipt cannot be returned if the
  //   item was not added to the vote bundle
  receipt.accepted = true;
  return receipt;
}

async function appendToBatch(submission) {
  const batchFileName = "/bundles/" + submission.vote.voteId;
  try {
    await namespace.fs("access", batchFileName, fsConstants.F_OK);
  } catch {
    // If file doesn't exist
    // Check for duplicate otherwise append file
    const data = await namespace.fs("readFile", batchFileName);
    if (data.includes(submission.senderAddress)) return "duplicate";
    await namespace.fs(
      "appendFile",
      batchFileName,
      "\r\n" + JSON.stringify(submission)
    );
    return generateReceipt(submission);
  }

  // If file does exist
  // Write to file and generate receipt if no error
  await namespace.fs("writeFile", batchFileName, JSON.stringify(submission));
  return generateReceipt(submission);
}

/**
 * check that the signature on the payload matches the address of the sender (inside the vote payload)
 * @param {*} payload
 * @returns
 */
async function generateReceipt(payload) {
  const blockHeight = await tools.getBlockHeight();
  return await tools.signPayload({
    vote: payload,
    blockHeight: blockHeight
  });
}
