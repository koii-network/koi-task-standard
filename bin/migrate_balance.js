const fs = require("fs");
const axios = require("axios");

const main = async () => {
  const balances = (await axios.get("https://mainnet.koii.live/state")).data
    .balances;
  const newBalances = {};
  const addresses = Object.keys(balances);
  for (let i = 0; i < addresses.length; ++i) {
    if (
      typeof addresses[i] === "string" &&
      addresses[i].length === 43 &&
      !(addresses[i].indexOf(" ") >= 0)
    ) {
      newBalances[addresses[i]] = balances[addresses[i]];
    }
    console.log("Done", i + 1, "/", addresses.length);
  }
  fs.writeFileSync("dist/balances.json", JSON.stringify(newBalances));
};
main();
