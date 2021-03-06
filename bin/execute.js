require("dotenv").config();
const fsPromises = require("fs/promises");
const koiSdk = require("@_koi/sdk/node");
const kohaku = require("@_koi/kohaku");

const KOII_CONTRACT_ID = "rCgc9NOBriEv21wV98FWb7n_ySggRibpPJpWxEgNxqI";

const tools = new koiSdk.Node(
  process.env.TRUSTED_SERVICE_URL,
  KOII_CONTRACT_ID
);

const executable = process.argv[2];
const taskTxId = process.argv[3];
const operationMode = process.argv[4];
process.env.NODE_MODE = process.env.NODE_MODE || operationMode;

async function main() {
  await tools.loadWallet(await tools.loadFile(process.env.WALLET_LOCATION));
  console.log("Executing with wallet", await tools.getWalletAddress());

  let expressApp;
  if (operationMode === "service") {
    tools.loadRedisClient();

    // Setup middleware and routes then start server
    const express = require("express");
    const cors = require("cors");
    const cookieParser = require("cookie-parser");
    expressApp = express();
    expressApp.use(cors());
    expressApp.use(express.urlencoded({ extended: true }));
    expressApp.use(express.json());
    expressApp.use(jsonErrorHandler);
    expressApp.use(cookieParser());
  }

  // Load task
  const taskSrc = await fsPromises.readFile(
    `src/${executable}/executable.js`,
    "utf8"
  );
  const loadedTask = new Function(`
    const [tools, namespace, require] = arguments;
    ${taskSrc};
    return {setup, execute};`);
  const executableTask = loadedTask(
    tools,
    new Namespace(taskTxId, expressApp),
    require
  );

  // Init Kohaku
  if (taskTxId !== "test") {
    // Comment out if Kohaku not cached
    // console.log("Restoring Kohaku");
    // const restore = await tools.redisGetAsync("kohaku");
    // const { arweave } = require("@_koi/sdk/common")
    // await kohaku.importCache(arweave, restore);

    console.log("Initializing Koii contract for Kohaku");
    await tools.getKoiiStateAwait();
    const initialHeight = kohaku.getCacheHeight();
    console.log("Kohaku initialized to height", kohaku.getCacheHeight());
    if (initialHeight < 1) throw new Error("Failed to initialize");
  }

  // Initialize tasks then start express app
  await executableTask.setup(null);
  const port = process.env.SERVER_PORT || 8887;
  if (operationMode === "service") {
    expressApp.get("/tasks", (_req, res) => {
      res.send([taskTxId]);
    });
    expressApp.listen(port, () => {
      console.log(`Open http://localhost:${port} to view in browser`);
    });
    const routes = expressApp._router.stack
      .map((route) => route.route)
      .filter((route) => route !== undefined)
      .map((route) => route.path);
    console.log("Routes:\n-", routes.join("\n- "));
  }

  // Execute tasks
  await executableTask.execute(null);
  console.log("All tasks complete");
}

class Namespace {
  constructor(taskTxId, expressApp) {
    this.taskTxId = taskTxId;
    this.app = expressApp;
  }
  redisGet(path) {
    return tools.redisGetAsync(this.taskTxId + path);
  }
  redisSet(path, data) {
    return tools.redisSetAsync(this.taskTxId + path, data);
  }
  redisKeys(pattern){
    return tools.redisKeysAsync(this.taskTxId+pattern)
  }
  redisDel(key){
    return tools.redisDelAsync(this.taskTxId+key)
  }
  async fs(method, path, ...args) {
    const basePath = "namespace/" + this.taskTxId;
    await fsPromises.mkdir(basePath, { recursive: true }).catch(() => {});
    return fsPromises[method](`${basePath}/${path}`, ...args);
  }
  express(method, path, callback) {
    return this.app[method]("/" + this.taskTxId + path, callback);
  }
}

function jsonErrorHandler(err, req, res, next) {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error(err);
    return res.status(400).send({ status: 404, message: err.message }); // Bad request
  }
  next();
}

main().then(() => {
  console.log("Terminated");
});
