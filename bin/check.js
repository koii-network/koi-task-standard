const fs = require("fs");
const Arweave = require("arweave");
const { readContract } = require("smartweave");
const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
  timeout: 60000,
  logging: false
});

const main = async () => {
  const newNftStructure = {};
  const invalidNftsCheck = [];
  const invalidNfts = JSON.parse(
    fs.readFileSync(
      "/Users/makdasebhatu/Desktop/koi-contract/koi-task-standard/dist/invalidNfts.json"
    )
  );
  for (let i = 0; i < invalidNfts.length; ++i) {
    const owners = {};
    try {
      const nftState = await readContract(arweave, invalidNfts[i]);
      for (let address in nftState.balances) {
        if (nftState.balances[address] > 0) {
          owners[address] = nftState.balances[address];
        }
      }
      newNftStructure[invalidNfts[i]] = owners;
    } catch (e) {
      console.error(e);
      invalidNftsCheck.push(invalidNfts[i]);
    }
    console.log("Done", i + 1, "/", invalidNfts.length);
  }
  fs.writeFileSync("invalidNftsCheck.json", JSON.stringify(invalidNftsCheck));
};
main();
