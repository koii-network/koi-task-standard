const { ktools } = require("../helper");
const fetch = require("node-fetch");
const api = process.env.LOCAL_API || "http://localhost:3000";

runSync();

async function runSync() {
  console.log("running");

  const attentionState = await ktools.getState("attention");
  const txIdArr = Object.values(attentionState.nfts).flat();

  console.log("about to generate " + txIdArr.length + " social cards");

  const batchSize = 30;
  const batches = txIdArr.length / batchSize;
  // batches = 1;
  const batchDelay = 5000;
  const innerBatchDelay = batchDelay / batchSize;

  for (let i = 0; i < batches; i++) {
    console.log("queued " + i + " from count: " + i * batchSize);
    setTimeout(async () => {
      console.log("starting batch from " + i * batchSize);
      for (let x = 0; x < batchSize; x++) {
        console.log("working with ", i * batchSize + x);
        const id = txIdArr[i * batchSize + x];

        setTimeout(async () => {
          const thisCount = i * batchSize + x;
          console.log("generating card for " + id + " " + thisCount);
          await fetch(`${api}/generateCard/${id}`);
        }, x * innerBatchDelay);
        // count = count + 1;
      }
      console.log(
        i * batchSize + batchSize + " out of " + txIdArr.length + " completed "
      );
    }, batchDelay * i);
  }
}
