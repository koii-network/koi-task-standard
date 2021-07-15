/*
Available APIs:

tools
smartweave
arweave
fsConstants
Namespace {
  redisGet()
  redisSet()
  fs()
  express()
}
*/

const RESPONSE_ACTION_FAILED = 411;

var lastBlock = 0;
var lastLogClose = 0;
var isDistributed = false;
var isLogsSubmitted = false;
var isRanked = false;

function setup(_init_state) {
  if (Namespace.app) Namespace.express("post", "/submit-vote", submitVote);
}

async function execute(_init_state) {
  await (Namespace.app ? service() : witness());
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
    if (canSubmitBatch(state, block)) {
      const activeVotes = await activeVoteId(state);
      await submitVote(activeVotes);
    }
    await tryRankDistribute(state, block);
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
    await tryRankDistribute(state, block);
  }
}

async function getStateAndBlock() {
  const state = await smartweave.readContract(Namespace.taskTxId);
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

  if (block > this.lastBlock)
    console.log(
      block,
      "Searching for a task, distribution in",
      logClose - block,
      "blocks"
    );
  lastBlock = block;

  return [state, block];
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
    await Namespace.fs("access", batchFileName, fsConstants.F_OK);
  } catch {
    // If file doesn't exist
    // Check for duplicate otherwise append file
    const data = await Namespace.fs("readFile", batchFileName);
    if (data.includes(submission.senderAddress)) return "duplicate";
    await Namespace.fs(
      "appendFile",
      batchFileName,
      "\r\n" + JSON.stringify(submission)
    );
    return generateReceipt(submission);
  }

  // If file does exist
  // Write to file and generate receipt if no error
  await Namespace.fs("writeFile", batchFileName, JSON.stringify(submission));
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
