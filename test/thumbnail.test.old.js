// const smartest = require("@_koi/smartest");
let Arweave = require("arweave");
const {interactWrite, interactWriteDryRun} = require("smartweave")
let Smartweave = require('smartweave');
let fs = require('fs');
require("dotenv").config();
let contractInitialStateTx = "-cH8D20W-5Rql6sVcKWQ0j0NkjDGqWfqpWkCVNjdsn0";

const walletPath = process.env.WALLET_LOCATION;
if (!walletPath) throw new Error("WALLET_LOCATION not specified in .env");

const wallet = JSON.parse(fs.readFileSync(walletPath));

const arweave = Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https",
});

async function getLatestState() {
    const latestState = await Smartweave.readContract(arweave, contractInitialStateTx);
    console.log(latestState);
}
getLatestState();

async function update() {

    const input = {
        function: "proposeUpdate",
        "aid": 'gtSQKcx3Ex8eOdgZxNh0rWSNiKQCt3Xi02cGnJQ_uSM',
        "cid": 'QmVhDHYYas6rnt8frPqKp6T2KjobJfCDVEYEUUH8ZgBZhF'
    }

    // const input = {
    //         function: "proposeSlash",
    //         "uid": 'oDApIgwavkt2Ks2egnIF27iMMLMaVY41raK2l07ONp0',
    //         "data": 'Soma'
    //     }

    // `interactWrite` will return the transaction ID.
    const txid = await interactWrite(
        arweave,   
        wallet,          
        contractInitialStateTx,
        input
    )
    console.log(txid)
}
update();

