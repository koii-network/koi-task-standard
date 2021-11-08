let Smartweave = require('smartweave');
let Arweave = require('arweave');
// Init an arweave instance just like before.
const arweaveInstance = Arweave.init({
    host: 'arweave.net',
    protocol: 'https',
    port: 443
});

let contractIntialStateTx = "e1-8R65IX9iSRfy8ynn7NsXmKJ0ebXQlgZFyJUgLp3E";

async function getLatestState() {
    const latestState = await Smartweave.readContract(arweaveInstance, contractIntialStateTx);
    console.log(latestState);
}
getLatestState();

