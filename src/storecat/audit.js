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
//   ]
// }
async function getWinner(task) {
  // get winner
}

export default async function audit(state, action) {
  const tasks = state.tasks;
  const caller = action.caller;
  
  if(tasks.length == 0) throw new ContractError("There is no tasks to audit");
  let task = {};
  let block = SmartWeave.block.height;
  state.tasks.some((t) => {
    if (block >= task.close && !task.hasAudit && task.payloads.length > 0) {
      // if(t.payloads.length > 0)
      task = t;
      return true;
    }
  })
  // if(task.hasOwnProperty('open')) {
  //   await (getWinner(task));
  // }
  return { state };
}
