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
  port: 443
});

const OFFSET_PROPOSE_PORTS_END = 25; // 300; //12
const OFFSET_BATCH_VOTE_SUBMIT = 50; // 600; // 24
const OFFSET_PROPOSE_SLASH = 55; // 660; //27

const RESPONSE_OK = 200;
const RESPONSE_ACTION_FAILED = 411;
const RESPONSE_INTERNAL_ERROR = 500;

const ARWEAVE_RATE_LIMIT = 60000; // Reduce arweave load

let lastBlock = 0;
let lastLogClose = 0;

let hasSubmittedPorts = false;
let hasProposedSlash = false;
let hasRanked = false;
let hasDistributed = false;
let hasVoted = false;
let hasSubmitBatch = false;
let hasAudited = false;

const logsInfo = {
  filename: "ports.log",
  oldFilename: "old-ports.log"
};

function setup(_init_state) {
  if (namespace.app) {
    namespace.express("get", "/", root);
    namespace.express("get", "/cache", servePortCache);
    namespace.express("get", "/nft", getNft);
    namespace.express("get", "/nft-summaries", getNftSummaries);
    namespace.express("post", "/submit-vote", submitVote);
    namespace.express("post", "/submit-port", submitPort);
  }
}

function root(_req, res) {
  res
    .status(200)
    .type("application/json")
    .send(kohaku.readContractCache(namespace.taskTxId));
}

async function getNft(req, res) {
  try {
    const id = req.query.id;
    const attentionState = await tools.getState(namespace.taskTxId);
    const nfts = Object.values(attentionState.nfts).flat();
    if (!nfts.includes(id))
      return res.status(404).send(id + " is not registered");

    const nftState = await tools.getState(id);
    const attentionReport = attentionState.task.attentionReport;

    let attention = 0,
      reward = 0;
    for (const report in attentionReport) {
      if (id in report) {
        const totalAttention = Object.values(report).reduce((a, b) => a + b, 0);
        attention += report[id];
        reward += (report[id] * 1000) / totalAttention; // Int multiplication first for better perf
      }
    }

    res.status(200).send({ ...nftState, id, attention, reward });
  } catch (e) {
    console.error("Error responding with NFT:", e);
    res.status(500).send({ error: e });
  }
}

async function getNftSummaries(req, res) {
  try {
    // TODO add date filtering
    const period = req.query.period;
    const attentionState = await tools.getState(namespace.taskTxId);
    const attentionReport = attentionState.task.attentionReport;

    const nftMap = {};
    for (const owner in attentionState.nfts) {
      for (const id of attentionState.nfts[owner]) {
        nftMap[id] = {
          id,
          owner,
          attention: 0,
          reward: 0
        };
      }
    }

    for (const report in attentionReport) {
      let totalAttention = 0;
      for (const nftId in report) {
        nftMap[nftId].attention += report[nftId];
        totalAttention += report[nftId];
      }

      const rewardPerAttention = 1000 / totalAttention;
      for (const nftId in report)
        nftMap[nftId].reward += report[nftId] * rewardPerAttention;
    }

    res.status(200).send(Object.values(nftMap));
  } catch (e) {
    console.error("Error responding with nft summaries:", e);
    res.status(500).send({ error: e });
  }
}

async function execute(_init_state) {
  let state, block;
  for (;;) {
    try {
      [state, block] = await getAttentionStateAndBlock();
    } catch (e) {
      console.error("Error while fetching attention state and block", e);
      continue;
    }
    await (namespace.app ? service : witness)(state, block);
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
  await rateLimit();
  return [state, block];
}

async function service(state, block) {
  if (canProposePorts(state, block)) await proposePorts();
  if (canAudit(state, block)) await audit(state);
  if (canSubmitBatch(state, block)) await submitBatch(state);
  if (canRankPrepDistribution(state, block)) await rankPrepDistribution();
  if (canDistributeReward(state)) await distribute();
}

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

    const data = dataAndSignature.data;
    const payload = {
      date: new Date(),
      timestamp: data.timeStamp,
      trxId: data.payload,
      wallet: await arweave.wallets.ownerToAddress(publicKey), //generate from public modulo
      proof: {
        signature, //req.headers['x-request-signature'],
        public_key: publicKey
      }
    };
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
  const payload = await PublishPoRT();
  await lockPorts();
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
    fullLogs = await namespace.fs("readFile", logsInfo.filename);
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

async function canAudit(state, block) {
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

  const proposedData = activeProposedData.proposedData;
  await Promise.allSettled(
    proposedData.map(async (proposedData) => {
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

        if (await checkTxConfirmation(tx, task)) console.log("audit submitted");
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
    const bundlerAddress = await tools.getWalletAddress();
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
  activeVotes.map((vote) => {
    if (isVoteTracked(vote.id)) {
      activeVotesTracked.push(vote.id);
    }
  });

  return activeVotesTracked;
}

async function isVoteTracked(voteId) {
  const batchFileName = "batches/" + voteId;
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
  if (checkProposeSlash(state, block)) await proposeSlash(state);
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
