const axios = require("axios");

async function main() {
  const res = await axios.get("https://mainnet.koii.live/attention");
  const nfts = Object.values(res.data.nfts).flat();
  console.log("done");
}

main();
