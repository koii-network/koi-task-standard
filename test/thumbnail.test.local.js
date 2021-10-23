// import smartest
const smartest = require("@_koi/smartest");
let fs = require('fs');

// set the initial state
const thumbnailInitState = JSON.parse(
    fs.readFileSync(`../thumbnail/init_state.json`)
);
smartest.writeContractState(thumbnailContractId, thumbnailInitState);

// Load thumbnail contract and prepare input
const thumbnailSrc = fs.readFileSync(`test/thumbnail.js`, "utf8");
const thumbnailContractId = "q5w6e7r8";
const thumbnailInput = {
    function: "thumbnail",
    rngContractId: rngContractId
};

// Interact write contract
await smartest.interactWrite(
    arweave,
    thumbnailSrc,
    wallet,
    thumbnailInput,
    smartest.readContractState(thumbnailContractId),
    walletAddress,
    thumbnailContractId
);

// Inspect output
console.log(smartest.readContractState(thumbnailContractId));