const fs = require("fs");
const axios = require("axios");

async function main() {
  const state = (await axios.get("https://mainnet.koii.live/attention")).data;

  fs.writeFileSync(
    "dist/state_attentionReport.json",
    JSON.stringify(state.task.attentionReport)
  );
  fs.writeFileSync(
    "dist/proposed_data.json",
    JSON.stringify(state.task.proposedPayloads[0].proposedData[0])
  );
  fs.writeFileSync(
    "dist/prepare_distribution.json",
    JSON.stringify(state.task.prepareDistribution)
  );
}
main();
