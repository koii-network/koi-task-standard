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
  const nftFromFile = JSON.parse(
    fs.readFileSync(
      "/Users/makdasebhatu/Desktop/edge/koi-task-moddifed/newNfts.json"
    )
  );
  const nftsSaved = Object.keys(nftFromFile);
  const sortedNfts = JSON.parse(
    fs.readFileSync(
      "/Users/makdasebhatu/Desktop/koi-contract/koi-task-standard/sortedTxIds.json"
    )
  );
  const fixedNfts = JSON.parse(
    fs.readFileSync(
      "/Users/makdasebhatu/Desktop/clean-contract/contracts/utils/createNFT/matchedNfts.json"
    )
  );
  const fixedArray = Object.keys(fixedNfts);
  const invalidNfts = [];
  const newNftStructure = {};
  for (let i = 0; i < sortedNfts.length; ++i) {
    if (fixedArray.includes(sortedNfts[i])) {
      //console.log(sortedNfts[i]);
      newNftStructure[fixedNfts[sortedNfts[i]]] =
        nftFromFile[fixedNfts[sortedNfts[i]]];
      continue;
    }
    if (nftsSaved.includes(sortedNfts[i])) {
      newNftStructure[sortedNfts[i]] = nftFromFile[sortedNfts[i]];
    } else {
      const owners = {};
      try {
        const nftState = await readContract(arweave, sortedNfts[i]);
        for (let address in nftState.balances) {
          if (nftState.balances[address] > 0) {
            owners[address] = nftState.balances[address];
          }
        }
        newNftStructure[sortedNfts[i]] = owners;
      } catch (e) {
        console.error(e);
        invalidNfts.push(sortedNfts[i]);
      }
    }
    console.log("Done", i + 1, "/", sortedNfts.length);
  }
  fs.writeFileSync("newNftStructure.json", JSON.stringify(newNftStructure));
  //fs.writeFileSync("notFound.json", JSON.stringify(notFound));
  fs.writeFileSync("invalidNfts.json", JSON.stringify(invalidNfts));
};
main();
