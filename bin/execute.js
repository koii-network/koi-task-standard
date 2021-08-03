require("dotenv").config();
const fsPromises = require("fs/promises");
const koiSdk = require("@_koi/sdk/node");
const tools = new koiSdk.Node(
  process.env.TRUSTED_SERVICE_URL,
  "9BX6HQV5qkGiXV6hTglAuPdccKoEP_XI2NNbjHv5MMM"
);

const executable = process.argv[2];
const taskTxId = process.argv[3];
const operationMode = process.argv[4];

async function main() {
  await tools.nodeLoadWallet(process.env.WALLET_LOCATION);

  let expressApp;
  if (operationMode === "bundler") {
    tools.loadRedisClient();

    // Setup middleware and routes then start server
    const express = require("express");
    const cors = require("cors");
    const cookieParser = require("cookie-parser");
    expressApp = express();
    expressApp.use(cors());
    expressApp.use(express.urlencoded({ extended: true }));
    expressApp.use(express.json());
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

  // Initialize tasks then start express app
  await executableTask.setup(null);
  const port = process.env.SERVER_PORT || 8887;
  if (operationMode === "bundler") {
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
  async fs(method, path, ...args) {
    const basePath = "namespace/" + this.taskTxId;
    try {
      try {
        await fsPromises.access("namespace");
      } catch {
        await fsPromises.mkdir("namespace");
      }
      await fsPromises.access(basePath);
    } catch {
      await fsPromises.mkdir(basePath);
    }
    return fsPromises[method](`${basePath}/${path}`, ...args);
  }
  express(method, path, callback) {
    return this.app[method]("/" + this.taskTxId + path, callback);
  }
}

main().then(() => {
  console.log("Terminated");
});
