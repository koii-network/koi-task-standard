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

const SECONDS_PER_DAY = 86400;
const PERIOD_MAP = { "24h": 1, "1w": 7, "1m": 30, "1y": 365 };

const OFFSET_PROPOSE_PORTS_END = 300; // 300; //25
const OFFSET_BATCH_VOTE_SUBMIT = 600; //50
const OFFSET_PROPOSE_SLASH = 660; //55

const RESPONSE_OK = 200;
const RESPONSE_ACTION_FAILED = 411;
const RESPONSE_INTERNAL_ERROR = 500;
const REDIS_KEY = process.env["SERVICE_URL"];

const ARWEAVE_RATE_LIMIT = 60000; // Reduce arweave load
const REALTIME_PORTS_OFFSET = 86400;
const REALTIME_PORTS_CHECK_OFFSET = 1600;
const PORT_LOGS_CACHE_OFFSET = 300;

const NFT_CACHE_TIME = 600000; // 10m

let ports = {};
let lastBlock = 0;
let lastLogClose = 0;

let hasSubmittedPorts = false;
let hasProposedSlash = false;
let hasRanked = false;
let hasDistributed = false;
let hasVoted = false;
let hasSubmitBatch = false;
let hasAudited = false;

let portsLog = [];

const logsInfo = {
  redisPortsKey: `${REDIS_KEY}-ports`,
  lockedRedisPortsKey: `${REDIS_KEY}-lockedPorts`
};

function setup(_init_state) {
  if (namespace.app) {
    namespace.express("get", "/", root);
    namespace.express("get", "/close", getClose);
    namespace.express("get", "/id", getId);
    namespace.express("get", "/latest", latest);
    namespace.express("get", "/cache", servePortCache);
    namespace.express("get", "/nft", getNft);
    namespace.express("get", "/nft-summaries", getNftSummaries);
    namespace.express("get", "/realtime-attention", getRealtimeAttention);
    namespace.express("post", "/submit-vote", submitVote);
    namespace.express("post", "/submit-port", submitPort);
    initializePorts();
  }
}

setInterval(async () => {
  await namespace.redisSet(logsInfo.redisPortsKey, JSON.stringify(portsLog));
}, PORT_LOGS_CACHE_OFFSET * 1000);

async function initializePorts() {
  try {
    let redisPorts = await namespace.redisGet(logsInfo.redisPortsKey);
    if (redisPorts) portsLog = JSON.parse(redisPorts);
  } catch (e) {
    portsLog = [];
    console.log(e);
  }
}

async function root(_req, res) {
  res
    .status(200)
    .type("application/json")
    .send(await tools.getState(namespace.taskTxId));
}

async function getClose(_req, res) {
  const attentionState = await tools.getState(namespace.taskTxId);
  res
    .status(200)
    .type("application/json")
    .send(attentionState.task.close.toString());
}

async function latest(_req, res) {
  const attentionState = await tools.getState(namespace.taskTxId);
  const attentionReport = attentionState.task.attentionReport;
  const latestSummary = attentionReport[attentionReport.length - 1] || {};
  res
    .status(200)
    .type("application/json")
    .send(latestSummary);
}

function getId(_req, res) {
  res.status(200).send(namespace.taskTxId);
}
async function getNft(req, res) {
  try {
    // Validate nftId
    const id = req.query.id;
    if (!tools.validArId(id))
      return res.status(400).send({ error: "invalid txId" });

    // Try using state from redis cache
    const now = Date.now();
    const cacheStateStr = await namespace.redisGet(id)
      .catch((e) => {console.error("Error fetching from redis:", e)});
    if (cacheStateStr) {
      const cacheSplit = cacheStateStr.split("_", 1);
      if (now < parseInt(cacheSplit[0])) {
        return res
          .status(200)
          .type("application/json")
          .send(cacheSplit[1]);
      }
    }

    // Check NFT registration
    const attentionState = await tools.getState(namespace.taskTxId);
    const nfts = Object.keys(attentionState.nfts);
    const nftIndex = nfts.indexOf(id);
    if (nftIndex === -1) return res.status(404).send(id + " is not registered");

    // Get nft state from arweave
    let nftState;
    try {
      nftState = await tools.getState(id);
    } catch (e) {
      if (e.type !== "TX_NOT_FOUND") throw e;
      nftState = {
        owner: Object.keys(attentionState.nfts[id])[0] || "unknown",
        balances: attentionState.nfts[id],
        tags: ["missing"]
      };
    }

    // Add extra fields
    nftState.id = id;
    nftState.next = nfts[(nftIndex + 1) % nfts.length];
    nftState.prev = nfts[(nftIndex - 1 + nfts.length) % nfts.length];
    nftState.attention = 0;
    nftState.reward = 0;

    // Calculate attention and rewards
    for (const report of attentionState.task.attentionReport) {
      if (id in report) {
        const totalAttention = Object.values(report).reduce((a, b) => a + b, 0);
        nftState.attention += report[id];
        nftState.reward += (report[id] * 1000) / totalAttention; // Int multiplication first for better perf
      }
    }

    // Respond and cache
    const nftStateStr = JSON.stringify(nftState);
    res
      .status(200)
      .type("application/json")
      .send(nftStateStr);
    await namespace.redisSet(id, (now + NFT_CACHE_TIME) + "_" + nftStateStr);
  } catch (e) {
    console.error("getNft error:", e.message);
    res.status(400).send({ error: e });
  }
}

async function getNftSummaries(req, res) {
  try {
    // Initialize NFT map
    const attentionState = await tools.getState(namespace.taskTxId);
    const attentionReport = attentionState.task.attentionReport;

    const period = req.query.period; // TODO rename period to filter or sort
    const nftMap = {};
    const days = PERIOD_MAP[period];
    if (days) {
      // Filter by day
      const unixNow = Math.round(Date.now() / 1000);
      const oldestValidTimestamp = unixNow - days * SECONDS_PER_DAY;
      const nftRawTxs = getRawTxsCached(Object.keys(attentionState.nfts));
      for (const tx of nftRawTxs) {
        const id = tx.node.id;
        if (oldestValidTimestamp < tx.node.block.timestamp)
          nftMap[id] = {
            id,
            holders: Object.keys(attentionState.nfts[id]),
            attention: 0,
            reward: 0
          };
      }
    } // Skip filtering if day is not set
    else
      for (const id in attentionState.nfts) {
        nftMap[id] = {
          id,
          holders: Object.keys(attentionState.nfts[id]),
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
    let nftSummaryArr = Object.values(nftMap);
    if (period === "hot") {
      // add index to sort by hot
      const hotArr = nftSummaryArr.map((nft, i) => [nft, i]);
      hotArr.sort(
        (a, b) => b[0].attention + b[1] - (a[0].attention + a[1])
      );
      nftSummaryArr = hotArr.map((ele) => ele[0]);
    } else if (period === "new") nftSummaryArr.reverse();
    else if (period !== "old")
      nftSummaryArr.sort((a, b) => b.attention - a.attention);
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
setInterval(checkViews, REALTIME_PORTS_CHECK_OFFSET * 1000); //converting seconds to ms

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
    portsLog.push(payload);
    // await namespace.fs(
    //   "appendFile",
    //   logsInfo.redisPortsKey,
    //   JSON.stringify(payload) + "\n"
    // );

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
  try {
    let ports = await namespace.redisGet(logsInfo.lockedRedisPortsKey);
    if (ports) return res.send("ports");
    return res.send("");
  } catch (e) {
    res.send("");
  }
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
  const portLogs = await getLockedPorts();
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

async function getLockedPorts() {
  let logs = [];
  try {
    logs = await namespace.redisGet(logsInfo.lockedRedisPortsKey);
    logs = JSON.parse(logs);
    if (!logs) logs = [];
  } catch {
    console.log(e);
    console.error("Error reading raw logs");
    return [];
  }
  const prettyLogs = [];
  for (const log of logs) {
    try {
      if (log && !(log === " ") && !(log === "")) {
        if (!verifySignature(log)) return;
        prettyLogs.push(log);
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
    let redisPorts = JSON.stringify(portsLog);
    if (redisPorts) {
      await namespace.redisSet(logsInfo.lockedRedisPortsKey, redisPorts);
      portsLog = [];
      return;
    }
  } catch (e) {
    console.log(e);
    console.log("Unable to lock Ports ", e);
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
  const logs = [];
  try {
    logs = JSON.parse(fullLogs);
  } catch (e) {
    logs = [];
  }
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


let rawTxCache = [];
let nextFetch = 0;
function getRawTxsCached(ids){
  fetchRawTxs(ids).catch((e) => {
    console.error("Error fetching raw Txs:", e);
  })
  return rawTxCache;
}

async function fetchRawTxs(ids) {
  const CHUNK_SIZE = 2000;
  const FETCH_COOLDOWN = 600000;
  let now = Date.now();
  if (now < nextFetch) return;
  nextFetch = now + FETCH_COOLDOWN;

  let txInfos = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);

    let transactions = await getNextPage(chunk);
    txInfos = txInfos.concat(transactions.edges);
    while (transactions.pageInfo.hasNextPage) {
      const cursor = transactions.edges[transactions.edges.length - 1].cursor;
      transactions = await getNextPage(chunk, cursor);
      txInfos = txInfos.concat(transactions.edges);
    }
  }

  rawTxCache = txInfos;
}

async function getNextPage(ids, after) {
  const afterQuery = after ? `,after:"${after}"` : "";
  const query = `query {
    transactions(ids: ${JSON.stringify(ids)},
    sort: HEIGHT_ASC, first: 100${afterQuery}) {
      pageInfo { hasNextPage }
      edges { node { id block { timestamp } } cursor }
    }
  }`;
  const res = await arweave.api.post("graphql", { query });
  return res.data.data.transactions;
}
