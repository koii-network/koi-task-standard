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

import ClusterUtil from "./cluster";
import ScraperUtil from "./scraper";

const arweave = Arweave.init({
  host: "arweave.net",
  protocol: "https",
  port: 443,
  timeout: 60000,
  logging: false
});

// Define system constants
const ARWEAVE_RATE_LIMIT = 20000; // Reduce arweave load - 20seconds
const OFFSET_PER_DAY = 720;

let lastBlock = 0;
let lastLogClose = 0;

// You can also access and store files locally
// const logsInfo = {
//   filename: "history_storecat.log"
// };

// Define the setup block - node, external endpoints must be registered here using the namespace.express toolkit
function setup(_init_state) {
  if (namespace.app) {
    namespace.express("get", "/", root);
    namespace.express("get", "/id", getId);
    namespace.express("get", "/task/:owner", getTask);
    namespace.express("get", "/completed-task", getCompletedTask);
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

async function getTask(req, res) {
  try {
    // Validate owner address
    const owner = req.params.owner;
    if (!tools.validArId(owner))
      return res.status(400).send({ error: "invalid txId" });
    const storecatState = await tools.getState(namespace.taskTxId);
    const tasks = storecatState.tasks;
    // Get owner's task
    const ownerTasks = [];
    tasks.forEach(task => {
      if(task.owner === owner) {
        ownerTasks.push(task);
      }
    });
    
    res.status(200).send(ownerTasks);
  } catch (e) {
    console.error("getTask error:", e.message);
    res.status(400).send({ error: e });
  }
}

async function getCompletedTask(req, res) {
  try {
    // Validate owner address
    const owner = req.query.owner;
    const uuid = req.query.uuid;
    const hasOwner = req.query.hasOwnProperty("owner");
    const hasUuid = req.query.hasOwnProperty("uuid");
    if(hasOwner && owner !== ''){
      if (!tools.validArId(owner))
        return res.status(400).send({ error: "invalid txId" });
    }
    const storecatState = await tools.getState(namespace.taskTxId);
    const tasks = storecatState.tasks;
    // Get owner's task
    const completedTasks = [];
    tasks.forEach(task => {
      if(hasOwner && hasUuid){
        if(task.owner === owner && task.uuid === uuid) {
          completedTasks.push(task);
        }
      }else if(hasOwner) {
        completedTasks.push(task);
      }else if(hasUuid) {
        completedTasks.push(task);
      }
    });
    res.status(200).send(completedTasks);
  } catch (e) {
    console.error("getCompletedTask error:", e.message);
    res.status(400).send({ error: e });
  }
}

// Define the execution block (this will be triggered after setup is complete)
async function execute(_init_state) {
  let state, block;
  for (;;) {
    await rateLimit(); // should check scraping item existing
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
  if (!canRequestScrapingUrl(state)) await getScrapingRequest();
  if (!canScrape(state, block)) await scrape(state);
  const index_audit = canAudit(state, block)
  if (index_audit > -1) await audit(index_audit);
  await distribute();
  await writePayloadInPermaweb(state, block);
  await updateCompletedTask(state, block);
}
async function witness(state, block) {
  // if (checkForVote(state, block)) await tryVote(state);
  // if (await checkProposeSlash(state, block)) await proposeSlash(state);
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

/*
  canAudit : is it possible to audit
  return : boolean
*/

function canAudit(state, block) {
  const tasks = state.tasks;
  let matchIndex = -1;
  for (let index = 0; index < tasks.length; index++) {
    const element = tasks[index];
    if (block >= element.close && !element.hasAudit && element.payloads.length > 0) {
      matchIndex = index;
      break;
    }
  }
  return matchIndex;
}
/*
  An audit contract can optionally be implemented when using gradual consensus (see https://koii.network/gradual-consensus.pdf for more info)
*/
async function audit(matchIndex) {
  // const tasks = state.tasks;

  // if(tasks.length == 0) return false;
  // let matchIndex = -1;
  // for (let index = 0; index < tasks.length; index++) {
  //   const element = tasks[index];
  //   if (block >= element.close && !element.hasAudit && element.payloads.length > 0) {
  //     matchIndex = index;
  //     break;
  //   }
  // }
  // if(matchIndex === -1) {
  //   return false;
  // }
  const input = {
    function: "audit",
    id: matchIndex
  };
  const task_name = "submit audit";
  const tx = await kohaku.interactWrite(
    arweave,
    tools.wallet,
    namespace.taskTxId,
    input
  );

  await checkTxConfirmation(tx, task_name);
  //   console.log("audit submitted");
  return true;
}

async function distribute(state) {
  const tasks = state.tasks;

  if(tasks.length == 0) return false;
  const matchIndex = tasks.findIndex( t => !t.prepareDistribution.isReward && hasAudit)

  if( matchIndex === -1 ) return false;
  // submit main koii contract to distribute
  const input = {
    function: "distributeReward",
    matchIndex: matchIndex
  };
  const tx = await kohaku.interactWrite(
    arweave,
    tools.wallet,
    tools.contractId, // it is main contract id
    input
  );
  const task = "distributing reward to main contract";
  if (await checkTxConfirmation(tx, task)) {
    console.log("Distributed");
    // update distribute data in sub task
    const input = {
      function: "confirmDistributeReward",
      matchIndex: matchIndex
    };
    const task_name = "confirm distribute reward";
    const tx = await kohaku.interactWrite(
      arweave,
      tools.wallet,
      namespace.taskTxId,
      input
    );
    await checkTxConfirmation(tx, task_name)
    return true;
  }
  return false;
}

async function bundleAndExport(data) {
  const myTx = await arweave.createTransaction(
    {
      data: Buffer.from(JSON.stringify(data, null, 2), "utf8")
    },
    tools.wallet
  );

  myTx.addTag('owner', data.owner);
  myTx.addTag('task', 'storecat');
  myTx.addTag('url', data.url);
  myTx.addTag('created', Math.floor(Date.now() / 1000));
  await arweave.transactions.sign(myTx, tools.wallet);
  const result = await arweave.transactions.post(myTx);
  console.log("response arweave transaction" , result)
  if (result.status === 200) {
    // success transaction
    return myTx.id;
  } else {
    console.log("error response arweave transaction : " , result, data.uuid)
    return false;
  }
  // result.id = myTx.id;
  // return result;
}

async function writePayloadInPermaweb(state, block) {
  const tasks = state.tasks;

  if(tasks.length == 0) return false;
  
  let matchIndex = -1;
  for (let index = 0; index < tasks.length; index++) {
    const element = tasks[index];
    if (block >= element.close && element.hasAudit && element.prepareDistribution.isRewarded && !element.hasUploaded) {
      matchIndex = index;
      break;
    }
  }
  if(matchIndex === -1) {
    return false;
  }
  const task = tasks[matchIndex];
  let topHash = "";
  let topCt = 0;
  task.payloadHashs.forEach((hash) => {
    if(hash.count > topCt) {
      topCt = hash.count;
      topHash = hash.hash;
    }
  });
  // get top payloads
  const topPayload = task.payloads.find( payload => payload.hashPayload === topHash );
  const bundle = {
    owner: task.owner,
    uuid: task.uuid,
    url: task.url,
    payloads: topPayload // it should be changed with top Payload
  }
  const tId = await bundleAndExport(bundle);
  if(tId) {
    // update state via contract write
    const input = {
      function: "savedPayloadToPermaweb",
      txId: tId,
      matchIndex: matchIndex,
    };
    const task_name = "saved payload in permaweb";
    const tx = await kohaku.interactWrite(
      arweave,
      tools.wallet,
      namespace.taskTxId,
      input
    );
    await checkTxConfirmation(tx, task_name);
    return true;
  }
  return false;
}

async function updateCompletedTask(state, block) {
  const tasks = state.tasks;
  if(tasks.length == 0) return false;
  
  let matchIndex = -1;
  for (let index = 0; index < tasks.length; index++) {
    const element = tasks[index];
    if (element.hasAudit && element.hasUploaded && element.tId !== '') {
      matchIndex = index;
      break;
    }
  }
  if(matchIndex === -1) {
    return false;
  }
  // update state via contract write
  const input = {
    function: "updateCompletedTask",
    matchIndex: matchIndex,
  };
  const task_name = "updateCompletedTask";
  const tx = await kohaku.interactWrite(
    arweave,
    tools.wallet,
    namespace.taskTxId,
    input
  );
  await checkTxConfirmation(tx, task_name);
  return true;
}

function canRequestScrapingUrl() {
  return true;
}
/*
  Check owner whether scrape
  @returns boolean
*/
function canScrape(state, block) {
  const taskIndex = state.tasks.findIndex((t) => {
    // if current owner already scraped : return true
    const isPayloader = t.payloads.filter((p) => p.owner === tools.address);
    if(!t.hasAudit && t.close >= block && !isPayloader) return true;
    else return false;
  });
  if (taskIndex < 0) {
    console.log("There is no task for scraping");
    return false;
  }
  return true;
}
/*
  bounty request api
  @returns scraping url, bounty, uuid
*/
async function getScrapingRequest() {
  let url = "https://app.getstorecat.com:8888/api/v1/bounty/getScrapingUrl";
  const data = await fetch(url);
  console.log(data);

  // let return_url = "https://gmail.com";
  // state.task.scraping.uuid = "60d9cf5970d912231cc4a230";
  // state.task.scraping.bounty = 1;
  // state.task.scraping.url = return_url;
  // state.task.scraping.owner = 'ownerAddress';

  // check the owner has some koii
  if(data.status === "success") {

    const input = {
      function: "addScrapingRequest",
      scrapingRequest: data.data
    };
    const task_name = "add scraping request";
    const tx = await kohaku.interactWrite(
      arweave,
      tools.wallet,
      namespace.taskTxId,
      input
    );
    await checkTxConfirmation(tx, task_name);
    return true;
  }
  return false;
}
/*
  scrape : get scraping payload 
  @returns scraping payload, hashpayload
*/
async function scrape(state) {
  // let payload = {
  //   content: {
  //     Image: [],
  //     Text: [],
  //     Link: []
  //   }
  // };
  // let hashPayload = "2503e0483fe9bff8e3b18bf4ea1fe23b";
  let payload = await getPayload(state.task.url)
  // hash = md5(JSON.stringify(scrapingData))
  // state.hashPayload = hash
  const userPayload = {};
  userPayload.payload = payload;
  userPayload.hashPayload = md5(payload); //hashPayload;
  userPayload.owner = tools.address;
  // call interactWrite function
  // updatePayload
  const input = {
    function: "savePayload",
    payload: userPayload
  };
  const tx = await kohaku.interactWrite(
    arweave,
    tools.wallet,
    namespace.taskTxId,
    input
  );
  return true;
}
async function getPayload(url) {
  try {
    let cluster = await ClusterUtil.puppeteerCluster();
    const { html } = await cluster.execute({
      url,
      takeScreenshot: false
    });
    const scrapingData = await ScraperUtil.getPayload(html);
    console.log(
      "**************** finished scraping *******************",
      scrapingData
    );
    return scrapingData;
  } catch (error) {
    console.log('get payload error', error);
    return false;
  }
  
}
/**
 * Awaitable rate limit
 * @returns
 */
function rateLimit() {
  return new Promise((resolve) => setTimeout(resolve, ARWEAVE_RATE_LIMIT));
}
