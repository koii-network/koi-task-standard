let Smartweave = require('smartweave');
let Arweave = require('arweave');
// Init an arweave instance just like before.
const arweaveInstance = Arweave.init({
    host: 'arweave.net',
    protocol: 'https',
    port: 443
});

let contractIntialStateTx = "NJ_fElX5AZposmhhrbTNvbS2oQZxpaXvREpROaJ1iI8";

async function getLatestState() {
    const latestState = await Smartweave.readContract(arweaveInstance, contractIntialStateTx);
    console.log(latestState);
}
getLatestState();

