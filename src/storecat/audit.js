// The Audit function can be included optionall as a way of invoking a stake slashing behavior to penalize bad actors
// {
//   "open": 101,
//   "close": 850,
//   "uuid": "60d9cf5970d912231cc4a230",
//   "bounty": 1,
//   "url": "https://npmjs.org",
//   "hasAudit": false,
//   "hasReward": false,
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
// ]
// }

export default async function audit(state) {
  const tasks = state.tasks;

  if(tasks.length == 0) throw new ContractError("There is no tasks to audit");
  let block = SmartWeave.block.height;

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
  if(task.hasOwnProperty('open')) {
    // get Top count of hash
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

    if (task.owner.length !== 43 || task.owner.indexOf(" ") >= 0) {
      throw new ContractError("Address should have 43 characters and no space");
    }

    // check the top hash is correct
    if (topCt >= task.payloadHashs.length / 2) {
      // set bounty process
      // 1 discount bounty from requester
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
      // update task
      task.hasAudit = true;
    } else {
      // not possible audit - update close
      task.close = task.close + 720;
    }
  }
  return { state };
}
