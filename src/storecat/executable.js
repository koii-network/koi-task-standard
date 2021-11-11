/* eslint-disable no-prototype-builtins */
/* eslint-disable no-undef */

// Import SDK modules if you want to use them (optional)
const Arweave = require("arweave");
const kohaku = require("@_koi/kohaku");
const axios = require("axios");

let mainCluster = null;
const { Cluster } = require("puppeteer-cluster");
const cheerio = require("cheerio");
const md5 = require("md5");

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
  await getScrapingRequest(state);
  await scrape(state, block);
  await rank(state, block);
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
      !element.hasRanked &&
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
    console.log("error rank", error);
    return false;
  }
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
  get scraping request from outside server(app.getstorecat.com)
  @returns scraping url, bounty, uuid, owner
*/
async function getScrapingRequest(state) {
  let url = "https://app.getstorecat.com:8888/api/v1/bounty/getScrapingUrl";
  try {
    const { data } = await axios.get(url);
    // check the owner has some koii
    if (data.status === "success") {
      console.log("external url response");
      const result = data.data;
      console.log(result);
      // confirm duplicate scraping request
      for (let task of state.tasks) {
        if(task.uuid === result.uuid) {
          task.payloads.forEach((payload) => {
            if (
              contractTask.rewardedTaskId.includes(distribution.id) &&
              !distribution.isRewarded
            ) {
              distribution.isRewarded = true;
            }
          });
        }
      }
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
  } catch (error) {
    console.log("getScrapingRequest error", error);
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
    if (!t.hasRanked && t.close >= block && !isPayloader) return true;
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
      payloads: payload
    };
    const tId = await bundleAndExport(bundle);
    if (tId) {
      const userPayload = {};
      userPayload.payloadTxId = tId;
      userPayload.hashPayload = md5(JSON.stringify(payload)); // 32byte
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
    let cluster = await puppeteerCluster();
    const { html } = await cluster.execute({
      url,
      takeScreenshot: false
    });
    const scrapingData = await getPayloadFromHtml(html);
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
/****
 * cluster functions
 */
async function puppeteerCluster() {
  if (mainCluster) return mainCluster;
  try {
    mainCluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      maxConcurrency: 4
    });
  } catch (e) {
    console.log("create cluster failed");
    console.log(e);
    return false;
  }
  try {
    await mainCluster.task(async ({ page, data }) => {
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", {
          get: () => false
        });
      });
      await page.evaluateOnNewDocument(() => {
        // We can mock this in as much depth as we need for the test.
        window.navigator.chrome = {
          runtime: {}
          // etc.
        };
      });

      await page.evaluateOnNewDocument(() => {
        const originalQuery = window.navigator.permissions.query;
        return (window.navigator.permissions.query = (parameters) =>
          parameters.name === "notifications"
            ? Promise.resolve({
                state: Notification.permission
              })
            : originalQuery(parameters));
      });
      await page.evaluateOnNewDocument(() => {
        // Overwrite the `plugins` property to use a custom getter.
        Object.defineProperty(navigator, "plugins", {
          // This just needs to have `length > 0` for the current test,
          // but we could mock the plugins too if necessary.
          get: () => [1, 2, 3, 4, 5]
        });
      });
      // Pass the Languages Test.
      await page.evaluateOnNewDocument(() => {
        // Overwrite the `plugins` property to use a custom getter.
        Object.defineProperty(navigator, "languages", {
          get: () => ["en-US", "en"]
        });
      });
      await page.goto(data.url);
      const html = await page.content();
      if (data.takeScreenshot) {
        await page.setViewport({
          width: 1920,
          height: 1080
        });
        await page.screenshot({
          path: data.imagePath,
          type: "jpeg"
        });
        return {
          imagePath: data.imagePath,
          html
        };
      }
      return {
        html
      };
    });
  } catch (error) {
    console.log("cluster create error");
    console.log(error);
  }
  return mainCluster;
}
/**
 * scraper utils functions
 */
async function getPayloadFromHtml(html) {
  let $ = await cheerio.load(html);
  $("script").remove();
  $("style").remove();
  $("noscript").remove();
  $("link").remove();
  var payload = {
    title: "",
    content: "",
    image: ""
  };
  var title = "";
  // eslint-disable-next-line no-cond-assign
  if ((title = $('meta[property="og:title"]').attr("content"))) {
    payload.title = title;
    // eslint-disable-next-line no-cond-assign
  } else if ((title = $("meta[name=title]").attr("content"))) {
    payload.title = title;
  } else {
    $("h1,h2,h3,h4,h5,h6,p").each(function (i, elem) {
      if (i === 0) {
        title = $(elem).text().trim();
      }
    });
    if (!title) {
      title = $("title").text().trim();
    }
    payload.title = title;
  }
  var image = "";
  // image: meta:ogimage OR document.images[0]
  // eslint-disable-next-line no-cond-assign
  if ((image = $('meta[property="og:image"]').attr("content"))) {
    payload.image = image;
  } else {
    $("img").each(function (i) {
      if (i === 0) {
        image = $(this).attr("src");
      }
    });
    payload.image = image;
  }
  payload.content = await getScrapData($("body").html());
  return payload;
}

async function parseAndSaveAllSelctor($, selector, contentType) {
  let totalContent = [];
  $(selector).each((index, element) => {
    if (index < 500) {
      // add limitation 500 nodes
      let content = "";
      if (selector === "img") {
        content = $(element).attr("src");
      } else if (selector === "a") {
        content = $(element).attr("href");
      } else {
        content = $(element).text().trim();
      }
      let ids = $(element).attr("id");
      let classNames = $(element).attr("class");
      let subSelectorsArr = [];
      let subSelector = "";
      try {
        while ($(element)[0] && $(element)[0].name && !ids && !classNames) {
          subSelectorsArr.push($(element)[0].name);
          element = $(element).parent();
          ids = $(element).attr("id");
          classNames = $(element).attr("class");
        }
      } catch (e) {
        console.log(e);
        return;
      }
      for (let i = subSelectorsArr.length - 1; i >= 0; i--) {
        subSelector += `>${subSelectorsArr[i]}`;
      }
      if ($(element)[0] && $(element)[0].name) {
        const elementType = $(element)[0].name;
        let modifiedClassNames = ""; //contains .
        let modifiedIds = ""; //contains #

        if (classNames) {
          modifiedClassNames = `[class='${classNames}']`;
        }
        if (ids) {
          modifiedIds = `[id='${ids}']`;
        }
        let finalSelector = `${elementType}`;
        if (modifiedClassNames) finalSelector += `${modifiedClassNames}`;
        if (modifiedIds) finalSelector += `${modifiedIds}`;
        finalSelector += subSelector;
        let found = false;
        if ($(finalSelector).length >= 0) {
          $(finalSelector).each(async (i, item) => {
            if (selector === "img") {
              content = $(item).attr("src");
            } else if (selector === "a") {
              content = $(item).attr("href");
            } else {
              content = $(item).text().trim();
            }
            if (!found) {
              // finalSelectorIndex = i;
              let finalSelectorWithIndex = `${i}$` + finalSelector;
              if (
                content &&
                content.trim() !== "" &&
                content[0] !== "#" &&
                totalContent.filter((x) => x.text === content).length === 0
              ) {
                totalContent.push({
                  text: content,
                  type: contentType,
                  selector: finalSelectorWithIndex,
                  label: "sitemap " + contentType
                });
                found = true;
              }
            }
          });
        }
      } else {
        return;
      }
    }
  });
  return totalContent;
}

async function getScrapData(html) {
  let $ = await cheerio.load(html);

  //If element consists main tag
  if ($("main").length) {
    // console.log('Contains main tag');
    $ = await cheerio.load($("main").html());
  }
  $("script").remove();
  $("style").remove();
  $("nav").remove();
  $("head").remove();
  $("noscript").remove();
  $("link").remove();
  $("meta").remove();
  $("footer").remove();

  const dataImage = await parseAndSaveAllSelctor($, "img", "Image");
  const dataLink = await parseAndSaveAllSelctor($, "a", "Link");
  const dataText = await parseAndSaveAllSelctor(
    $,
    "h1, h2, h3, h4, h5, span, p",
    "Text"
  );
  // console.log(dataImage)
  // console.log(dataLink)
  // console.log(dataText)
  return {
    Image: dataImage,
    Link: dataLink,
    Text: dataText
  };
}
