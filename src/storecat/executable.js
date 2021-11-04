/* eslint-disable no-prototype-builtins */
/* eslint-disable no-undef */

// Import SDK modules if you want to use them (optional)
const Arweave = require("arweave");
const kohaku = require("@_koi/kohaku");
const axios = require("axios");

const ClusterUtil = require("./cluster");
const ScraperUtil = require("./scraper");

const arweave = Arweave.init({
  host: "arweave.net",
  protocol: "https",
  port: 443,
  timeout: 60000,
  logging: false
});

// Define system constants
const ARWEAVE_RATE_LIMIT = 20000; // Reduce arweave load - 20seconds
// const OFFSET_PER_DAY = 720;

// You can also access and store files locally
// const logsInfo = {
//   filename: "history_storecat.log"
// };

// Define the setup block - node, external endpoints must be registered here using the namespace.express toolkit
// eslint-disable-next-line no-unused-vars
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
    tasks.forEach((task) => {
      if (task.owner === owner) {
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
    if (hasOwner && owner !== "") {
      if (!tools.validArId(owner))
        return res.status(400).send({ error: "invalid txId" });
    }
    const storecatState = await tools.getState(namespace.taskTxId);
    const tasks = storecatState.tasks;
    // Get owner's task
    const completedTasks = [];
    tasks.forEach((task) => {
      if (hasOwner && hasUuid) {
        if (task.owner === owner && task.uuid === uuid) {
          completedTasks.push(task);
        }
      } else if (hasOwner) {
        completedTasks.push(task);
      } else if (hasUuid) {
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
// eslint-disable-next-line no-unused-vars
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

  if (!state) console.error("State or task invalid:", state);
  return [state, block];
}
async function service(state, block) {
  await getScrapingRequest();
  await scrape(state, block);
  await rank(index_audit);
  await distribute();
  await writePayloadInPermaweb(state, block);
  await updateCompletedTask(state);
}
// eslint-disable-next-line no-unused-vars
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
  rank: find top payload and prepareDistribution rewards
  @returns 
*/
async function rank(state, block) {
  const tasks = state.tasks;
  let matchIndex = -1;
  for (let index = 0; index < tasks.length; index++) {
    const element = tasks[index];
    if (
      block >= element.close &&
      !element.hasAudit &&
      element.payloads.length > 0
    ) {
      matchIndex = index;
      break;
    }
  }
  if (matchIndex === -1) {
    return false;
  }
  try {
    const input = {
      function: "rank",
      id: matchIndex
    };
    const task_name = "submit rank";
    const tx = await kohaku.interactWrite(
      arweave,
      tools.wallet,
      namespace.taskTxId,
      input
    );
    await checkTxConfirmation(tx, task_name);
    return true;
  } catch (error) {
    console.log('error rank', error);
    return false;
  }
}
function getBlockAndUuid(str) {
	const ids = str.split("_");
  return {blockT: ids[0], uuidT:ids[1]}
}
/*
  distribute: resolve prepared distribute reward
  call main contract distributeReward and then 
  update isRewarded = true of prepareDistribution
  @returns 
*/
async function distribute(state) {
  const tasks = state.tasks;
  if (tasks.length === 0) return false;

  const koiiState = await tools.getState(tools.contractId);
  if (!koiiState) {
    console.log("%cMain State:", "color: red");
    return false;
  }
  const storecatContractBlock = koiiState.filter( k => k.name === "storecat");
  if (storecatContractBlock) {
    // check rewardedBlock
    if (storecatContractBlock.rewardedBlock.length > 0) {
      for (let index = 0; index < storecatContractBlock.rewardedBlock.length; index++) {
        const rewardedBlockId = storecatContractBlock.rewardedBlock[index]; // rewardedBlockId = uuid + "_" + block
        if(rewardedBlockId !== "" && rewardedBlockId.length > 25) { // uuid length is 24byte
          const { blockT, uuidT } = getBlockAndUuid(rewardedBlockId);
          let matchIndex = tasks.findIndex(
            (t) => t.uuid === uuidT && t.open === Number(blockT) 
            && !t.prepareDistribution.isReward 
            && t.hasAudit && !t.hasUploaded
          );
          if (matchIndex > -1) {
            // updated distributeReward
            try {
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
                await checkTxConfirmation(tx, task_name);
                return true;
              }
              return false;
            } catch (error) {
              console.log('error distribute', error);
              return false;
            }
          }
        }
        
      }
    }
    return false;
  }
  return false;
}
/*
  bundleAndExport: upload data to permaweb (arweave )
  @returns 
*/
async function bundleAndExport(data, tag = false) {
  try {
    const myTx = await arweave.createTransaction(
      {
        data: Buffer.from(JSON.stringify(data, null, 2), "utf8")
      },
      tools.wallet
    );
    
    if (tag) {
      myTx.addTag("owner", data.owner);
      myTx.addTag("task", "storecat");
      myTx.addTag("url", data.url);
      myTx.addTag("created", Math.floor(Date.now() / 1000));
    } else {
      myTx.addTag("created", Math.floor(Date.now() / 1000));
    }
    await arweave.transactions.sign(myTx, tools.wallet);
    const result = await arweave.transactions.post(myTx);
    console.log("response arweave transaction", result);
    if (result.status === 200) {
      // success transaction
      return myTx.id;
    } else {
      console.log("error response arweave transaction : ", result, data.uuid);
      return false;
    }
  } catch (error) {
    console.log("error bundleAndExport", error);
    return false;
  }
}
/*
  writePayloadInPermaweb: upload payload of rewarded task to arweave
  save transactionId in state.task
  @returns 
*/
async function writePayloadInPermaweb(state, block) {
  const tasks = state.tasks;

  let matchIndex = -1;
  for (let index = 0; index < tasks.length; index++) {
    const element = tasks[index];
    if (
      block >= element.close &&
      element.hasAudit &&
      element.prepareDistribution.isRewarded &&
      !element.hasUploaded
    ) {
      matchIndex = index;
      break;
    }
  }
  if (matchIndex === -1) {
    return false;
  }
  const task = tasks[matchIndex];
  let topPayloadTxId = "";
  let topCt = 0;
  task.payloads.forEach((hash) => {
    if (hash.count > topCt) {
      topCt = hash.count;
      topPayloadTxId = hash.payloadTxId;
    }
  });
  // get top payloads
  if (topPayloadTxId !== "") {
    // const topPayload = await tools.getTransaction(topPayloadTxId); // not tested yet
    const input = {
      function: "savedPayloadToPermaweb",
      txId: topPayloadTxId,
      matchIndex: matchIndex
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
    /*
    try {
      const bundle = {
        owner: task.owner,
        uuid: task.uuid,
        url: task.url,
        payloads: topPayload.data.payload
      };
      const tId = await bundleAndExport(bundle, true);
      if (tId) {
        // update state via contract write
        const input = {
          function: "savedPayloadToPermaweb",
          txId: tId,
          matchIndex: matchIndex
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
    } catch (error) {
      console.log('error writePayloadInPermaweb', error);
      return false;
    }
    */
  } else {
    return false;
  }
}
/*
  updateCompletedTask: update completed task status 
  @returns remove task and added completedTasks
*/
async function updateCompletedTask(state) {
  const tasks = state.tasks;
  if (tasks.length == 0) return false;

  let matchIndex = -1;
  for (let index = 0; index < tasks.length; index++) {
    const element = tasks[index];
    if (element.hasAudit && element.hasUploaded && element.tId !== "") {
      matchIndex = index;
      break;
    }
  }
  if (matchIndex === -1) {
    return false;
  }
  // update state via contract write
  const input = {
    function: "completeTask",
    matchIndex: matchIndex
  };
  const task_name = "completeTask";
  const tx = await kohaku.interactWrite(
    arweave,
    tools.wallet,
    namespace.taskTxId,
    input
  );
  await checkTxConfirmation(tx, task_name);
  return true;
}
/*
  get scraping request from outside server(app.getstorecat.com)
  @returns scraping url, bounty, uuid, owner
*/
async function getScrapingRequest() {
  let url = "https://app.getstorecat.com:8888/api/v1/bounty/getScrapingUrl";
  const data = await axios.get(url);

  // check the owner has some koii
  if (data.status === "success") {
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
  scrape : save payload into task.payloads
  save the payload into task.payloads
  @returns scraping payload, hashpayload
*/
async function scrape(state, block) {
  const taskIndex = state.tasks.findIndex((t) => {
    // if current owner already scraped : return true
    const isPayloader = t.payloads.filter((p) => p.owner === tools.address);
    if (!t.hasAudit && t.close >= block && !isPayloader) return true;
    else return false;
  });
  if (taskIndex < 0) {
    console.log("There is no task for scraping");
    return false;
  }
  const task = state.tasks[taskIndex];
  let payload = await getPayload(task.url);

  // upload payload to permaweb because we can't send more than 2kb data to contract
  try {
    const bundle = {
      payloads: topPayload
    };
    const tId = await bundleAndExport(bundle);
    if (tId) {
      const userPayload = {};
      userPayload.payloadTxId = tId;
      userPayload.hashPayload = md5(payload); //128byte
      userPayload.owner = tools.address;
      // call interactWrite function
      // savePayload
      const input = {
        function: "savePayload",
        matchIndex: taskIndex,
        payload: userPayload
      };
      const task_name = "save payload";
      const tx = await kohaku.interactWrite(
        arweave,
        tools.wallet,
        namespace.taskTxId,
        input
      );
      await checkTxConfirmation(tx, task_name);
      return true;
    } else {
      // failed upload payload to permaweb
      return false;
    }
  } catch (error) {
    console.log("error payload upload to permaweb ", error);
    return false;
  }
}
/*
  getPayload : get payload from url
  it is using puppeteerCluster and cheerio
  @returns scraping payload
*/
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
    console.log("get payload error", error);
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
