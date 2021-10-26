/*
 prepareDistribution pay task winner balance.
*/

//   "payloads": [
//     {
//       "payload": {},
//       "hashPayload": "2503e0483fe9bff8e3b18bf4ea1fe23b",
//       "owner": "FjA4pYgLA4hdaQT4ltLur8pHAoMo_0hARtfS36cPOSk",
//       "txId": "LDZY2RB-wPDNkRhVh5s5G0S_r9FNFTp_UjqTcXtn7w4"
//     }
//   ],
// "payloadHashs": [
//   {
//     "payload": {},
//     "hashPayload": "2503e0483fe9bff8e3b18bf4ea1fe23b",
//     "count": 1
//   }
export default async function prepareDistribution(state) {
  const tasks = state.tasks;

  let matchIndex = -1;
  for (let index = 0; index < tasks.length; index++) {
    const element = tasks[index];
    if (block >= element.close && !element.hasAudit && element.payloads.length > 0) {
      matchIndex = index;
      break;
    }
  }
  if(matchIndex === -1) {
    throw new ContractError("There is no task to audit");
  }

  const task = tasks[matchIndex];

  if (task.owner.length !== 43 || task.owner.indexOf(" ") >= 0) {
    throw new ContractError("Address should have 43 characters and no space");
  }

  if(task.hasOwnProperty('open')) {
    // calc top hash and prepare balance
    let topHash = "";
    let topCt = 0;
    let topPayload = {};
    task.payloadHashs.forEach((hash) => {
      if(hash.count > topCt) {
        topCt = hash.count;
        topHash = hash.hash;
        topPayload = hash.payload;
      }
    });

    // check the top hash is correct
    if (topCt >= task.payloadHashs.length / 2) {
      // set bounty process
      // 1 discount bounty from requester
    }
    // -- if the owner of scraper didn't enough bounty balance, this scraper will be ignored
    task.prepareDistribution.push({task.owner: task.bounty * -1})
    // 2 set bounty to winner - top 8 nodes
    let deeper = 0;

    task.payloads.forEach((hash) => {
      if (hash.hashPayload == topHash && deeper < 8) {
        deeper++;
        // pay bounty to winner
        let qty = Number(task.bounty * Math.pow(2, deeper * -1));
        // if (balances[hash.owner]) balances[hash.owner] += qty;
        // else balances[hash.owner] = qty;
        task.prepareDistribution.push({hash.owner: qty})
        console.log(
          "set bounty target - " +
            hash.owner +
            ", deep : " +
            deeper +
            ", bounty : " +
            qty
        );
      }
    });
  }
  return { state };
}
