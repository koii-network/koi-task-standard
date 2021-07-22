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
const smartweave = require("smartweave");
const axios = require("axios");
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
var isLogsSubmitted = false;
var isRanked = false;
var isDistributed = false;

const logsInfo = {
  filename: getTodayDateAsString(),
  oldFileName: getYesterdayDateAsString()
};

function setup(_init_state) {
  console.log(namespace.express);
  if (namespace.app) namespace.express("post", "/submit-vote", submitVote);
  if (namespace.app) namespace.express("post", "/submit-port", submitPort);
  if (namespace.app) namespace.express("get", "/cache", servePortCache);
}

async function execute(_init_state) {
  await (namespace.app ? service() : witness());
}

async function service() {
  let state, block;
  for (;;) {
    try {
      [state, block] = await getAttentionStateAndBlock();
    } catch (e) {
      console.error("Error", e.message);
      continue;
    }

    if (canSubmitData(state, block)) await submitData();
    // if (canAudit(state, block)) await audit(state);
    // if (canSubmitBatch(state, block)) await submitBatch(state);
    if (canRankAndPrepareDistribution(state, block))
      await rankAndPerpareDistribution();
    if (canDistributeReward(state)) await distribute();
  }
}

async function witness() {
  let state, block;
  for (;;) {
    try {
      [state, block] = await getAttentionStateAndBlock();
    } catch (e) {
      console.error(e.message);
      continue;
    }

    if (checkForVote(state, block)) await tryVote(state);
    if (checkProposeSlash(state, block)) await tools.proposeSlash();
  }
}
async function servePortCache(req, res) {
  let logs = await namespace.fs("readFile", logsInfo.filename, "utf8");
  res.send(logs);
}

async function auditPort(txId) {
  let response = await axios.get("http://localhost:8887/test/cache");
  const fullLogs = response.data;
  var prettyLogs = [];
  let logs = fullLogs.toString().split("\n");
  for (let log of logs) {
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
  let finalLogs = {};
  for (let i = 0; i < prettyLogs.length; i++) {
    const e = prettyLogs[i];
    let keys = Object.keys(finalLogs);
    if (keys.includes(e["trxId"])) {
      finalLogs[e["trxId"]].push(e["wallet"]);
    } else {
      finalLogs[e["trxId"]] = [e["wallet"]];
    }
  }
  const str = JSON.stringify(finalLogs);
  const parseCacheData = JSON.parse(str);
  const proposedData = await arweave.transactions.getData(txId, {
    decode: true,
    string: true
  });
  const parseProposedData = JSON.parse(proposedData);

  return parseProposedData == parseCacheData;
}

/**
 * Accepts Port traffic logs
 * @param {*} fileName express.js request
 */
async function PublishPoRT() {
  let portLogs = await readRawLogs();
  let finalLogs = {};
  for (let i = 0; i < portLogs.length; i++) {
    const e = portLogs[i];
    let keys = Object.keys(finalLogs);
    if (keys.includes(e["trxId"])) {
      finalLogs[e["trxId"]].push(e["wallet"]);
    } else {
      finalLogs[e["trxId"]] = [e["wallet"]];
    }
  }
  return finalLogs;
}

async function readRawLogs() {
  let fullLogs;
  try {
    fullLogs = await namespace.fs("readFile", logsInfo.filename);
  } catch {
    console.error("Error reading raw logs");
    return [];
  }
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
  return prettyLogs;
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
  yesterday.setDate(yesterday.getDate() - 1);
  let year = new Intl.DateTimeFormat("en", { year: "numeric" }).format(
    yesterday
  );
  let month = new Intl.DateTimeFormat("en", { month: "short" }).format(
    yesterday
  );
  let day = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(yesterday);
  return `${day}-${month}-${year}`;
}
function difficultyFunction(hash) {
  return hash.startsWith("00") || hash.startsWith("01");
}
async function submitPort(_req, _res) {
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
      console.log(
        Buffer.from(JSON.stringify(JSON.stringify(dataAndSignature.signature)))
      );
      let signatureHash = await arweave.crypto.hash(
        Buffer.from(dataAndSignature.signature)
      );
      signatureHash = signatureHash.toString("hex");

      if (!difficultyFunction(signatureHash)) {
        console.log("Signature hash incorrect");
      }

      let data = dataAndSignature.data;
      var payload = {
        date: new Date(),
        timestamp: data.timeStamp,
        trxId: data.resourceId,
        wallet: await arweave.wallets.ownerToAddress(publicKey), //generate from public modulo
        proof: {
          signature, //req.headers['x-request-signature'],
          public_key: publicKey
        }
      };
      let fileName = getTodayDateAsString();
      await namespace.fs(
        "appendFile",
        logsInfo.filename,
        JSON.stringify(payload) + "\n"
      );

      _res.status(200).json({
        message: "Port Received"
      });
    }
  } catch (e) {
    console.error(e);
    _res.status(500).send({ error: "ERROR: " + e });
  }
}

async function getAttentionStateAndBlock() {
  const state = await smartweave.readContract(arweave, namespace.taskTxId);
  let block = await tools.getBlockHeight();
  if (block < lastBlock) block = lastBlock;

  const logClose = state.task.close;
  if (logClose > lastLogClose) {
    if (lastLogClose !== 0) {
      console.log("Logs updated, resetting trackers");
      //isDistributed = false;
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
/**
 *
 * @param {*} state
 * @param {number} block
 * @returns {bool}
 */
function canSubmitData(state, block) {
  const task = state.task;
  if (
    // block >= task.open + OFFSET_SUBMIT_END || // block too late or
    block >= task.open ||
    !isLogsSubmitted // logs not submitted
  )
    return true;
}

async function submitData() {
  const payload = await PublishPoRT();

  if (Object.keys(payload).length === 0) {
    isLogsSubmitted = true;
    console.error("Payload empty, skipping submission");
    return;
  }

  const result = await bundleAndExport(payload);
  let task = "post payload";
  if (await checkTxConfirmation(result.id, task)) {
    console.log("payload posted");
  }
  let input = {
    function: "submitDistribution",
    distributionTxId: result.id, // it should be ressult.id
    cacheUrl: "http://localhost:8887/test/cache",
    mainContractId: tools.contractId,
    contractId: namespace.taskTxId
  };
  task = "submitData";
  const tx = await smartweave.interactWrite(
    arweave,
    tools.wallet,
    namespace.taskTxId,
    input
  );

  if (await checkTxConfirmation(tx, task)) {
    isLogsSubmitted = true;
    console.log("Logs submitted");
  }
}
/**
 *
 * @param {*} state
 * @param {number} block
 * @returns {bool}
 */
async function canAudit(state, block) {
  const task = state.task;
  const activeProposedDatas = task.proposedPaylods.find(
    (proposedDatas) => proposedDatas.block === task.open
  );

  const proposedDatas = activeProposedDatas.proposedDatas;
  if (!proposedDatas.length) {
    return false;
  } else {
    return true;
  }
}

async function audit(state) {
  const task = state.task;
  const activeProposedDatas = task.proposedPaylods.find(
    (proposedDatas) => proposedDatas.block === task.open
  );

  const proposedDatas = activeProposedDatas.proposedDatas;
  await Promise.all(
    proposedDatas.map(async (proposedData) => {
      const valid = await auditPort(proposedData.txId);
      if (!valid) {
        let input = {
          function: "audit",
          id: proposedData.id,
          descripition: "malicious_data"
        };
        let task = "submit audit";
        const tx = await smartweave.interactWrite(
          arweave,
          tools.wallet,
          namespace.taskTxId,
          input
        );

        if (await checkTxConfirmation(tx, task)) {
          isLogsSubmitted = true;
          console.log("audit submitted");
        }
      }
    })
  );
}

function canSubmitBatch(state, block) {
  if (state.task === undefined) return false;
  const trafficLogs = state.task;
  return (
    trafficLogs.open + OFFSET_BATCH_SUBMIT < block &&
    block < trafficLogs.open + OFFSET_PROPOSE_SLASH
  );
}

async function submitBatch(state) {
  const activeVotes = await activeVoteId(state);
  let task = "submitting votes";
  for (let activeVoteId of activeVotes) {
    const state = await tools.getContractState();
    const vote = state.votes.find((vote) => vote.id == activeVoteId);
    const bundlers = vote.bundlers;
    const bundlerAddress = await tools.getWalletAddress();
    if (!(bundlerAddress in bundlers)) {
      const txId = (await batchUpdateContractState(activeVoteId)).id;
      if (!(await checkTxConfirmation(txId, task))) {
        console.log("Vote submission failed");
        return;
      }
      const arg = {
        batchFile: activeVoteId,
        voteId: voteId,
        bundlerAddress: bundlerAddress
      };
      const resultTx = await tools.batchAction(arg);
      task = "batch";
      if (!(await checkTxConfirmation(resultTx, task))) {
        console.log("Batch failed");
        return;
      }
    }
  }
}

async function activeVoteId(state) {
  // Check if votes are tracked simultaneously
  const votes = state.votes;
  const areVotesTrackedProms = votes.map((vote) => isVoteTracked(vote.id));
  const areVotesTracked = await Promise.all(areVotesTrackedProms);

  // Get active votes
  const close = state.task.close;
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
function canRankAndPrepareDistribution(state, block) {
  const task = state.task;
  if (
    block < task.close || // not time to rank and distribute or
    isRanked || // we've already rank and distribute or
    !task.proposedPaylods.length // daily traffic log is empty
  )
    return false;

  const currentTrafficLogs = task.proposedPaylods.find(
    (proposedTask) => proposedTask.block === task.open
  );
  isRanked = currentTrafficLogs.isRanked;
  return !currentTrafficLogs.isRanked;
}

/**
 *
 */
async function rankAndPerpareDistribution() {
  let input = {
    function: "rankAndPrepareDistribution"
  };
  const tx = await smartweave.interactWrite(
    arweave,
    tools.wallet,
    namespace.taskTxId,
    input
  );
  const task = "ranking and prepare distribution";
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
function canDistributeReward(subContractState) {
  const prepareDistribution = subContractState.task.prepareDistribution;
  // check if there is not rewarded distributions
  const unRewardedDistribution = prepareDistribution.filter(
    (distribution) => !distribution.isRewardAddToMainContract
  );
  if (!unRewardedDistribution.length || isDistributed) {
    return false;
  } else {
    return true;
  }
}

/**
 *
 */
async function distribute() {
  let input = {
    function: "distributeReward"
  };
  const tx = await smartweave.interactWrite(
    arweave,
    tools.wallet,
    tools.contractId,
    input
  );
  const task = "distributing reward to main Contract";
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
  const task = state.task;
  const votes = state.votes;
  if (!votes.length) {
    return false;
  }
  return block < task.open + OFFSET_BATCH_SUBMIT;
}

/**
 * Tries to vote
 * @param {*} state Current contract state data
 */
async function tryVote(state) {
  await createFile();
  const dataBuffer = await readTrackedVotes();
  const dataString = dataBuffer.toString();
  const voteIds = dataString.voteId;
  const votes = state.votes;
  const activeVotes = votes.filter((vote) => vote.status == "active");
  await Promise.all(
    activeVotes.map(async (vote) => {
      // check if the node already voted for the activeVotes
      if (!voteIds.includes(vote.id)) {
        const receiptFrombundler = await validateAndVote(vote.id, state);
        const receipt = dataString.receipt;
        receipt.push(receiptFrombundler);
        voteIds.push(vote.id);
        await updateData({ voteId: voteIds, receipt: receipt });
      }
    })
  );
}
async function createFile() {
  const batchFileName = "newfile.txt";
  try {
    await namespace.fs("access", batchFileName, fsConstants.F_OK);
    return;
  } catch {
    // If file doesn't exist

    await namespace.fs(
      "writeFile",
      batchFileName,
      JSON.stringify({ voteId: [], receipt: [] })
    );
  }
}
async function readTrackedVotes() {
  const batchFileName = "newfile.txt";
  const data = await namespace.fs("readFile", batchFileName);
  return data;
}
async function updateData(data) {
  const batchFileName = "newfile.txt";
  await namespace.fs("writeFile", batchFileName, JSON.stringify(data));
}
/**
 *
 * @param {string} voteId
 * @param {*} state Current block height
 * @returns {boolean} If can slash
 */

async function validateAndVote(id, state) {
  const suspectedProposedData = state.task.proposedPaylods.proposedDatas.find(
    (proposedData) => proposedData.id === id
  );
  const valid = audit(suspectedProposedData.txId);
  // audit the suspectedProposedData
  // if suspectedData is not Valid userVote = true, if userVote = false

  if (valid) {
    let input = {
      voteId: id,
      userVote: "true"
    };
    const signPayload = await tools.signPayload(input);
    const receipt = axios.post("http://localhost:8887/submitVote", signPayload);
    return receipt;
  } else {
    let input = {
      voteId: id,
      userVote: "true"
    };
    const signPayload = await tools.signPayload(input);
    const receipt = axios.post("http://localhost:8887/submitVote", signPayload);
    return receipt;
  }

  // save the receipt if the bundler did't submit the vote then the node use the receipt to slash
}
/**
 *
 * @param {*} state
 * @param {number} block Current block height
 * @returns {boolean} If can slash
 */
function checkProposeSlash(state, block) {
  const trafficLogs = state.task;
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
