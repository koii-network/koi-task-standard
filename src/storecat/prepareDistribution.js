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
  if(matchIndex === -1)
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

  }
  return { state };
}
