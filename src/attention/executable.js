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

const CORRUPTED_NFT = [
  "Y4txuRg9l1NXRSDZ7FDtZQiTl7Zv7RQ9impMzoReGDU",
  "dyLgErL7IJfSH2fU9mWBhfSdb5HOUnU2lOPq5y1twho",
  "54ExppB1akUYllW4BZhmYx679eMtiA6tSTsrJ8IDCOo",
  "EpbbtviT8nqC3aCflyfM5sWf0lAq6YsFW6K48T1tAbU",
  "oOyREnD872TBaOnXDMNG5CM3QYYpqJTNuSe4sL2sCfc",
  "YYSb3A_VYwgs1l_MEXnhNvKmdIwTBQ2GYBpJa2qNOU0",
  "O7whFDUayKrP4bKdKAwYRWw1qwJ4-5alQWVoSAI1i_4",
  "UI2V5Yyd4dW-1KdJnpVZDNFZ3l6reZ4nrKKg_YCN_Wo",
  "X63sVIgKjL7lf3CBCDRjUrkXEkm8QulJw1mVpc6LHKc",
  "kpgshM3-SZbK2ChO3lJIPQ84hS90_FnJBNsSr9n3QHA",
  "A268M4BDGF6y-wA7MZ-1G5QAyfj8Hufcop4fVHu0SFc",
  "s52dZCUGSTF2Sl3QF2f1Egyv-BCSrqulkMk3fXT9EOw",
  "QIrGq8VqcqbGEV2QHQOyS7TjMm_Xpa_5mww3edn0TUs",
  "ZTZDEPuAfh2Nsv9Ad46zJ4k6coHbZcmi7BcJgt126wU"
];

const DEFAULT_CREATED_AT = 1617000000; // March 29 2021 is default NFT age if field is not specified
const SECONDS_PER_DAY = 86400;
const PERIOD_MAP = { "24h": 1, "1w": 7, "1m": 30, "1y": 365 };

const OFFSET_PROPOSE_PORTS_END = 300; // 25;
const OFFSET_BATCH_VOTE_SUBMIT = 600; // 50;
const OFFSET_PROPOSE_SLASH = 660; // 55;

const RESPONSE_OK = 200;
const RESPONSE_ACTION_FAILED = 411;
const RESPONSE_INTERNAL_ERROR = 500;

const ARWEAVE_RATE_LIMIT = 60000; // Reduce arweave load
let ports = {};
const REALTIME_PORTS_OFFSET = 120;

let lastBlock = 0;
let lastLogClose = 0;

let hasSubmittedPorts = false;
let hasProposedSlash = false;
let hasRanked = false;
let hasDistributed = false;
let hasVoted = false;
let hasSubmitBatch = false;
let hasAudited = false;

let nftStateMapCache = {};

const logsInfo = {
  filename: "ports.log",
  oldFilename: "old-ports.log"
};

function setup(_init_state) {
  if (namespace.app) {
    namespace.express("get", "/", root);
    namespace.express("get", "/id", getId);
    namespace.express("get", "/cache", servePortCache);
    namespace.express("get", "/nft", getNft);
    namespace.express("get", "/nft-summaries", getNftSummaries);
    namespace.express("get", "/realtime-attention", getRealtimeAttention);
    namespace.express("post", "/submit-vote", submitVote);
    namespace.express("post", "/submit-port", submitPort);
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

async function getNft(req, res) {
  try {
    const id = req.query.id;
    tools.assertTxId(id);
    let attentionState;

    // Get NFT state
    let nftState;
    if (nftStateMapCache.hasOwnProperty(id)) {
      nftState = nftStateMapCache[id];
      if (nftState.updatedAttention) return res.status(200).send(nftState);
      attentionState = await tools.getState(namespace.taskTxId);
    } else {
      attentionState = await tools.getState(namespace.taskTxId);
      const nfts = Object.values(attentionState.nfts).flat();
      if (!nfts.includes(id))
        return res.status(404).send(id + " is not registered");
      try {
        nftState = await tools.getState(id);
      } catch (e) {
        if (e.type !== "TX_NOT_FOUND") throw e;
        nftState = {
          owner: Object.keys(attentionState.nfts).find((owner) =>
            attentionState.nfts[owner].includes(id)
          ),
          tags: ["missing"],
          createdAt: DEFAULT_CREATED_AT
        };
      }
      nftState.id = id;
      nftStateMapCache[id] = nftState;
    }

    // Calculate attention and rewards
    nftState.updatedAttention = true;
    nftState.attention = 0;
    nftState.reward = 0;
    for (const report of attentionState.task.attentionReport) {
      if (id in report) {
        const totalAttention = Object.values(report).reduce((a, b) => a + b, 0);
        nftState.attention += report[id];
        nftState.reward += (report[id] * 1000) / totalAttention; // Int multiplication first for better perf
      }
    }
    res.status(200).send(nftState);
  } catch (e) {
    console.error("Error responding with NFT:", e);
    res.status(500).send({ error: e });
  }
}

async function getNftSummaries(req, res) {
  try {
    // Initialize NFT map
    const attentionState = await tools.getState(namespace.taskTxId);
    const attentionReport = attentionState.task.attentionReport;
    const nftMap = {};

    const days = PERIOD_MAP[req.query.period];
    if (days) {
      // Filter by day
      const unixNow = Math.round(Date.now() / 1000);
      const oldestValidTimestamp = unixNow - days * SECONDS_PER_DAY;
      for (const owner in attentionState.nfts) {
        for (const id of attentionState.nfts[owner]) {
          if (CORRUPTED_NFT.includes(id)) continue;
          if (
            !(id in nftStateMapCache) || // If not in cache, assume valid age
            oldestValidTimestamp <
              (parseInt(nftStateMapCache[id].createdAt) || DEFAULT_CREATED_AT)
          )
            nftMap[id] = {
              id,
              owner,
              attention: 0,
              reward: 0
            };
        }
      }
    } else
      for (const owner in attentionState.nfts)
        for (const id of attentionState.nfts[owner]) {
          if (CORRUPTED_NFT.includes(id)) continue;
          nftMap[id] = {
            id,
            owner,
            attention: 0,
            reward: 0
          };
        }

    // Calculate attention and rewards
    for (const report of attentionReport) {
      let totalAttention = 0;
      for (const nftId in report) {
        totalAttention += report[nftId];
        if (nftId in nftMap) nftMap[nftId].attention += report[nftId];
      }

      const rewardPerAttention = 1000 / totalAttention;
      for (const nftId in report)
        if (nftId in nftMap)
          nftMap[nftId].reward += report[nftId] * rewardPerAttention;
    }

    // Sort and send nft summaries
    const nftSummaryArr = Object.values(nftMap);
    nftSummaryArr.sort((a, b) => {
      return b.attention - a.attention;
    });
    res.status(200).send(nftSummaryArr);
  } catch (e) {
    console.error("Error responding with nft summaries:", e);
    res.status(500).send({ error: e });
  }
}

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
  if (canProposePorts(state, block)) await proposePorts();
  if (canAudit(state, block)) await audit(state);
  if (canSubmitBatch(state, block)) await submitBatch(state);
  if (canRankPrepDistribution(state, block)) await rankPrepDistribution();
  if (canDistributeReward(state)) await distribute();
}
setInterval(checkViews, REALTIME_PORTS_OFFSET * 1000); //converting seconds to ms

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
    : res.json({
        message: "duplicate Vote or Invalid Signature"
      });
}

async function checkVote(payload) {
  if (!(await tools.verifySignature(payload))) return { accepted: false };
  const receipt = await appendToBatch(payload); // Since it's valid, append it to the vote list
  if (receipt == undefined) {
    return {
      accepted: false
    };
  }
  // NOTE: we piggy back the receipt on this function because
  //   this ensures that the receipt cannot be returned if the
  //   item was not added to the vote bundle
  receipt.accepted = true;
  return receipt;
}

async function appendToBatch(submission) {
  const batchFileName = "batches/" + submission.vote.voteId;
  try {
    await namespace.fs("access", "batches");
  } catch {
    await namespace.fs("mkdir", "batches");
  }
  try {
    await namespace.fs("access", batchFileName);
  } catch (e) {
    // If file doesn't exist
    // Write to file and generate receipt if no error
    await namespace.fs("writeFile", batchFileName, JSON.stringify(submission));
    return generateReceipt(submission);
  }

  // If file does exist
  // Check for duplicate otherwise append file
  const data = await namespace.fs("readFile", batchFileName);
  if (data.includes(submission.senderAddress)) return;
  await namespace.fs(
    "appendFile",
    batchFileName,
    "\r\n" + JSON.stringify(submission)
  );
  return generateReceipt(submission);
}

async function generateReceipt(payload) {
  const blockHeight = await tools.getBlockHeight();
  return await tools.signPayload({
    vote: payload,
    blockHeight: blockHeight
  });
}
function addPortView(data, wallet) {
  try {
    if (!Object.keys(ports).includes(data.payload)) {
      ports[data.payload] = {
        count: 1,
        viewers: [{ wallet: wallet, timeStamp: data.timeStamp }]
      };
    } else {
      let nft = ports[data.payload];
      // viewer = nft.viewers.find((e) => {
      //   if (e.wallet == wallet);
      // });
      // if (viewer) return;
      nft.count++;
      nft.viewers.push({
        wallet,
        timeStamp: data.timeStamp
      });
    }
  } catch (e) {
    console.log("Error in addPortView", e);
  }
  // console.dir(ports)
}
function getRealtimeAttention(req, res) {
  id = req.query.id;
  let data;
  try {
    data = {
      count: ports[id]["count"]
    };
  } catch (e) {
    data = {
      count: 0
    };
  }
  return res.json(data);
}
function checkViews() {
  currentTimeStamp = Math.floor(+new Date() / 1000);
  let keys = Object.keys(ports);
  for (let i = 0; i < keys.length; i++) {
    let viewers = ports[keys[i]]["viewers"];
    for (let j = 0; j < viewers.length; j++) {
      const e = viewers[j];
      if (currentTimeStamp - e.timeStamp > REALTIME_PORTS_OFFSET) {
        e.deleted = true;
        ports[keys[i]]["count"]--;
      }
    }
    let newViewers = [];
    for (let j = 0; j < viewers.length; j++) {
      const e = viewers[j];
      if (!e.deleted) {
        newViewers.push(JSON.parse(JSON.stringify(e)));
      }
    }
    ports[keys[i]]["viewers"] = newViewers;
    namespace.fs("writeFile", "realtimeports.log", JSON.stringify(ports));
  }
}
async function submitPort(req, res) {
  try {
    const signature = req.body["x-request-signature"];
    const publicKey = req.body["request-public-key"];

    if (!signature) {
      console.error("Port received without signature");
      return res
        .status(RESPONSE_ACTION_FAILED)
        .send({ error: "ERROR: No signature" });
    }

    const dataAndSignature = JSON.parse(signature);
    const valid = await tools.verifySignature({
      ...dataAndSignature,
      owner: publicKey
    });
    if (!valid) {
      console.log("Signature verification failed");
      return res
        .status(RESPONSE_ACTION_FAILED)
        .send({ error: "ERROR: PoRT verification failed " });
    }
    let signatureHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(dataAndSignature.signature))
      .digest("hex");
    signatureHash = signatureHash.toString("hex");

    if (!difficultyFunction(signatureHash)) {
      console.log("Signature hash incorrect");
      return res
        .status(RESPONSE_ACTION_FAILED)
        .send({ error: "ERROR: PoRT verification failed " });
    }
    let wallet = await arweave.wallets.ownerToAddress(publicKey); //generate from public modulo
    const data = dataAndSignature.data;
    const payload = {
      date: new Date(),
      timestamp: data.timeStamp,
      trxId: data.payload,
      wallet,
      proof: {
        signature, //req.headers['x-request-signature'],
        public_key: publicKey
      }
    };
    addPortView(data, wallet);
    await namespace.fs(
      "appendFile",
      logsInfo.filename,
      JSON.stringify(payload) + "\n"
    );

    res.status(RESPONSE_OK).json({
      message: "Port Received"
    });
  } catch (e) {
    console.error("Error in port submission", e);
    res.status(RESPONSE_INTERNAL_ERROR).send({ error: "ERROR: " + e });
  }
}

function difficultyFunction(hash) {
  return hash.startsWith("00") || hash.startsWith("01");
}

async function servePortCache(_req, res) {
  await namespace.fs("appendFile", logsInfo.oldFilename, "");
  const logs = await namespace.fs("readFile", logsInfo.oldFilename, "utf8");
  res.send(logs);
}

function canProposePorts(state, block) {
  const open = state.task.open;
  return (
    block < open + OFFSET_PROPOSE_PORTS_END && // block in time frame
    !hasSubmittedPorts // ports not submitted
  );
}

async function proposePorts() {
  await lockPorts();
  const payload = await PublishPoRT();
  if (Object.keys(payload).length === 0) {
    hasSubmittedPorts = true;
    console.error("Payload empty, skipping submission");
    return;
  }
  const result = await bundleAndExport(payload);

  let task = "post payload";
  if (await checkTxConfirmation(result.id, task)) console.log("payload posted");

  const input = {
    function: "submitDistribution",
    distributionTxId: result.id,
    cacheUrl: process.env.SERVICE_URL
  };
  task = "proposePorts";
  const tx = await kohaku.interactWrite(
    arweave,
    tools.wallet,
    namespace.taskTxId,
    input
  );

  if (await checkTxConfirmation(tx, task)) {
    hasSubmittedPorts = true;
    console.log("Ports submitted");
  }
}

async function PublishPoRT() {
  const portLogs = await readRawLogs();
  const finalLogs = {};
  for (let i = 0; i < portLogs.length; i++) {
    const e = portLogs[i];
    const keys = Object.keys(finalLogs);
    if (keys.includes(e["trxId"])) {
      if (!finalLogs[e["trxId"]].includes(e["wallet"]))
        finalLogs[e["trxId"]].push(e["wallet"]);
    } else finalLogs[e["trxId"]] = [e["wallet"]];
  }
  return finalLogs;
}

async function readRawLogs() {
  let fullLogs;
  try {
    fullLogs = await namespace.fs("readFile", logsInfo.oldFilename);
  } catch {
    console.error("Error reading raw logs");
    return [];
  }
  const logs = fullLogs.toString().split("\n");
  const prettyLogs = [];
  for (const log of logs) {
    try {
      if (log && !(log === " ") && !(log === "")) {
        const logJson = JSON.parse(log);
        if (!verifySignature(logJson)) return;
        prettyLogs.push(logJson);
      }
    } catch (err) {
      console.error("Error verifying log signature:", err);
    }
  }
  // console.log('resolving some prettyLogs ('+ prettyLogs.length +') sample:', prettyLogs[prettyLogs.length - 1])
  return prettyLogs;
}

async function verifySignature(log) {
  let signature = log.proof.signature;
  const publicKey = log.proof.public_key;

  if (!signature) {
    console.error("Port submitted without signature");
    return false;
  }

  const dataAndSignature = JSON.parse(signature);
  const valid = await tools.verifySignature({
    ...dataAndSignature,
    owner: publicKey
  });
  if (!valid) {
    console.log("Signature verification failed");
    return false;
  }

  let signatureHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(dataAndSignature.signature))
    .digest("hex");
  signatureHash = signatureHash.toString("hex");

  if (!difficultyFunction(signatureHash)) {
    console.log("Signature hash incorrect");
    return false;
  }
}

async function lockPorts() {
  try {
    await namespace.fs("rm", logsInfo.oldFilename);
  } catch (e) {
    console.log("Unable to remove old ports file");
  }
  let data = "";
  try {
    data = await namespace.fs("readFile", logsInfo.filename);
  } catch (e) {
    console.log("Unable to read previous port file");
  }
  try {
    await namespace.fs("writeFile", logsInfo.oldFilename, data);
    await namespace.fs("writeFile", logsInfo.filename, "");
  } catch (e) {
    console.error("Error writing ports files");
  }
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

/**
 * Awaitable rate limit
 * @returns
 */
function rateLimit() {
  return new Promise((resolve) => setTimeout(resolve, ARWEAVE_RATE_LIMIT));
}

async function bundleAndExport(bundle) {
  const myTx = await arweave.createTransaction(
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

function canRankPrepDistribution(state, block) {
  const task = state.task;
  if (
    block < task.close || // not time to rank and distribute or
    hasRanked // we've already rank and distribute
  )
    return false;

  // If proposed payloads are empty, just rank anyways to start next game
  if (task.proposedPayloads.length === 0) return true;

  const currentTrafficLogs = task.proposedPayloads.find(
    (proposedTask) => proposedTask.block === task.open
  );
  hasRanked = currentTrafficLogs.isRanked;
  return !hasRanked;
}

function canSubmitBatch(state, block) {
  if (hasSubmitBatch) return false;
  const open = state.task.open;
  return (
    open + OFFSET_BATCH_VOTE_SUBMIT < block &&
    block < open + OFFSET_PROPOSE_SLASH
  );
}

async function submitBatch(state) {
  const activeVotes = await activeVoteId(state);
  let task = "submitting votes";
  for (const activeVoteId of activeVotes) {
    const vote = state.votes.find((vote) => vote.id == activeVoteId);
    const bundlers = vote.bundlers;
    const bundlerAddress = tools.address;
    if (!(bundlerAddress in bundlers)) {
      const txId = (await batchUpdateContractState(activeVoteId)).id;
      if (!(await checkTxConfirmation(txId, task))) {
        console.log("Vote submission failed");
        return;
      }
      const input = {
        function: "batchAction",
        batchFile: txId,
        voteId: activeVoteId
      };
      const resultTx = await kohaku.interactWrite(
        arweave,
        tools.wallet,
        namespace.taskTxId,
        input
      );
      task = "batch";
      if (!(await checkTxConfirmation(resultTx, task))) {
        console.log("Batch failed");
        return;
      }
    }
  }
  hasSubmitBatch = true;
}

async function activeVoteId(state) {
  // Check if votes are tracked simultaneously
  const votes = state.votes;
  const activeVotesTracked = [];
  const activeVotes = votes.filter((vote) => vote.status === "active");
  activeVotes.map(async (vote) => {
    if (await isVoteTracked(vote.id)) {
      activeVotesTracked.push(vote.id);
    }
  });

  return activeVotesTracked;
}

async function isVoteTracked(voteId) {
  const batchFileName = "batches/" + voteId;
  try {
    await namespace.fs("access", "batches");
  } catch (_e) {
    return false;
  }
  try {
    await namespace.fs("access", batchFileName);
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

async function getVotesFile(fileId) {
  const batchFileName = "batches/" + fileId;
  await namespace.fs("access", batchFileName);
  return await namespace.fs("readFile", batchFileName, "utf8");
}

async function rankPrepDistribution() {
  const input = {
    function: "rankPrepDistribution"
  };
  const tx = await kohaku.interactWrite(
    arweave,
    tools.wallet,
    namespace.taskTxId,
    input
  );
  const task = "ranking and prepare distribution";
  if (await checkTxConfirmation(tx, task)) {
    hasRanked = true;
    console.log("Ranked");
  }
}

function canDistributeReward(subContractState) {
  if (hasDistributed) return false;

  const prepareDistribution = subContractState.task.prepareDistribution;
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
    tools.contractId,
    input
  );
  const task = "distributing reward to main contract";
  if (await checkTxConfirmation(tx, task)) {
    hasDistributed = true;
    console.log("Distributed");
  }
}

// ############################# Witness Mode #############################

async function witness(state, block) {
  if (checkForVote(state, block)) await tryVote(state);
  if (await checkProposeSlash(state, block)) await proposeSlash(state);
}

function checkForVote(state, block) {
  const task = state.task;
  const votes = state.votes;
  const activeVotes = votes.filter((vote) => vote.status === "active");
  if (!activeVotes.length || !votes.length || hasVoted) {
    return false;
  }
  return block < task.open + OFFSET_BATCH_VOTE_SUBMIT;
}

async function tryVote(state) {
  const { voteIds, receipts } = await createReadVotRec();
  const votes = state.votes;
  const activeVotes = votes.filter((vote) => vote.status == "active");
  await Promise.all(
    activeVotes.map(async (vote) => {
      // check if the node already voted for the activeVotes
      if (!voteIds.includes(vote.id)) {
        const receiptFrBundler = await validateAndVote(vote.id, state);
        if (receiptFrBundler !== null) {
          const receiptsTracked = receipts;
          receiptsTracked.push(receiptFrBundler);
          voteIds.push(vote.id);
          await updateData({ voteIds, receipts });
        }
      }
    })
  );
  hasVoted = true;
}

async function createReadVotRec() {
  const batchFileName = "newfile.txt";
  try {
    const data = await namespace.fs("readFile", batchFileName, "utf8");
    return JSON.parse(data);
  } catch (e) {
    await namespace.fs(
      "writeFile",
      batchFileName,
      JSON.stringify({ voteIds: [], receipts: [] })
    );
    return { voteIds: [], receipts: [] };
  }
}

async function validateAndVote(id, state) {
  const currentPayload = state.task.proposedPayloads.find(
    (payload) => payload.block === state.task.open
  );
  const suspectedProposedData = currentPayload.proposedData.find(
    (proposedData) => proposedData.txId === id
  );
  const valid = auditPort(
    suspectedProposedData.txId,
    suspectedProposedData.cacheUrl
  );
  const input = {
    function: "vote",
    voteId: id,
    userVote: String(valid)
  };
  const nodeAddress = await tools.getWalletAddress();
  const payload = {
    vote: input,
    senderAddress: nodeAddress
  };
  const signPayload = await tools.signPayload(payload);
  const receipt = await axios.post(
    `${process.env.TRUSTED_SERVICE_URL}/${namespace.taskTxId}/submit-vote`,
    signPayload
  );

  return "receipt" in receipt.data ? receipt.data.receipt : null;
  // save the receipt if the bundler didn't submit the vote then the node use the receipt to slash
}

async function auditPort(txId, url) {
  console.log("Trying to fetch:", url); // TODO FIX ME, NOT USING PROPER URL
  const response = await axios.get(`${url}/${namespace.taskTxId}/cache`);
  const fullLogs = response.data;
  const prettyLogs = [];
  const logs = fullLogs.toString().split("\n");
  for (const log of logs) {
    try {
      if (log && !(log === " ") && !(log === "")) {
        const logJSON = JSON.parse(log);
        if (!verifySignature(logJSON)) continue;
        prettyLogs.push(logJSON);
      }
    } catch (err) {
      console.error("Error verifying signature while auditing port:", err);
    }
  }
  const finalLogs = {};
  for (let i = 0; i < prettyLogs.length; i++) {
    const e = prettyLogs[i];
    const keys = Object.keys(finalLogs);
    if (keys.includes(e["trxId"])) {
      if (!finalLogs[e["trxId"]].includes(e["wallet"]))
        finalLogs[e["trxId"]].push(e["wallet"]);
    } else finalLogs[e["trxId"]] = [e["wallet"]];
  }
  let proposedData = await arweave.transactions.getData(txId, {
    decode: true,
    string: true
  });
  proposedData = JSON.parse(proposedData);

  const proposedDataKeys = Object.keys(proposedData).sort();

  const finalLogsKeys = Object.keys(finalLogs).sort();
  if (proposedDataKeys.length !== finalLogsKeys.length) return false;
  if (!proposedDataKeys.every((e, i) => e === finalLogsKeys[i])) return false;
  for (const proposedNFT of proposedDataKeys) {
    const proposedViewers = proposedData[proposedNFT].sort();
    const cachedViewers = finalLogs[proposedNFT].sort();
    if (cachedViewers.length !== cachedViewers.length) return false;
    if (!proposedViewers.every((e, i) => e === cachedViewers[i])) return false;
    return true;
  }
}

async function updateData(data) {
  const batchFileName = "newfile.txt";
  await namespace.fs("writeFile", batchFileName, JSON.stringify(data));
}
async function activeVotesVoted(state) {
  const { voteIds, receipts } = await createReadVotRec();
  const ids = []; //get the tracked VoteIds for activeVotes.
  const activeVotes = state.votes.filter((vote) => vote.status === "active"); // active votes
  activeVotes.map((activeVote) => {
    if (voteIds.includes(activeVote.id)) {
      ids.push(activeVote.id);
    }
  });
  return { receipts: receipts, activeVotes: activeVotes, ids: ids };
}

async function checkProposeSlash(state, block) {
  const task = state.task;
  const { receipts, activeVotes, ids } = await activeVotesVoted(state);
  if (!activeVotes.length || !ids || hasProposedSlash || !receipts.length) {
    return false;
  }

  return task.open + OFFSET_PROPOSE_SLASH < block && block < task.close;
}

async function proposeSlash(state) {
  const { receipts, activeVotes, ids } = await activeVotesVoted(state);
  const nodeAddress = await tools.getWalletAddress();
  await Promise.all(
    activeVotes.map(async (activeVote) => {
      for (const voteId of ids) {
        if (activeVote.id === voteId) {
          if (!activeVote.votersList.includes(nodeAddress)) {
            const receipt = receipts.find(
              (receipt) => receipt.vote.vote.voteId == voteId
            );
            let task = "posting receipt data";
            const receiptTx = await bundleAndExport(receipt);
            if (await checkTxConfirmation(receiptTx.id, task))
              console.log("receipt posted");
            const input = {
              function: "proposeSlash",
              receiptTxId: receiptTx.id
            };
            task = "slash";
            const tx = await kohaku.interactWrite(
              arweave,
              tools.wallet,
              namespace.taskTxId,
              input
            );
            if (await checkTxConfirmation(tx, task)) {
              hasProposedSlash = true;
              console.log("slashed");
            }
          }
        }
      }
    })
  );
}
