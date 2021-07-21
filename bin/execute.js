require("dotenv").config();
const fsPromises = require("fs/promises");
const koiSdk = require("@_koi/sdk/node");
const tools = new koiSdk.Node(process.env.TRUSTED_SERVICE_URL);

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

  const taskStates = [null];
  const taskSrcs = [
    await fsPromises.readFile(`src/${executable}/executable.js`, "utf8")
  ];
  const executableTasks = taskSrcs.map((src) =>
    loadTaskSource(src, new Namespace(taskTxId, expressApp))
  );

  // Initialize tasks then start express app
  await Promise.all(
    executableTasks.map((task, i) => task.setup(taskStates[i]))
  );
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
  await Promise.all(
    executableTasks.map((task, i) => task.execute(taskStates[i]))
  );
  console.log("All tasks complete");
}

/**
 * @param {string} taskSrc // Source of contract
 * @param {Namespace} namespace // Wrapper object for redis, express, and filesystem
 * @returns // Executable task
 */
function loadTaskSource(taskSrc, namespace) {
  const loadedTask = new Function(`
      const [tools, namespace, require] = arguments;
      ${taskSrc};
      return {setup, execute};
  `);
  return loadedTask(tools, namespace, require);
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
    try {
      await fsPromises.access(this.taskTxId);
    } catch {
      await fsPromises.mkdir(this.taskTxId);
    }
    return fsPromises[method](`${this.taskTxId}/${path}`, ...args);
  }
  express(method, path, callback) {
    return this.app[method]("/" + this.taskTxId + path, callback);
  }
}

main().then(() => {
  console.log("Terminated");
});
