export default async function rank(state, action) {
  const tasks = state.tasks;
  const matchIndex = action.input.id;

  if (typeof matchIndex !== "number") {
    // eslint-disable-next-line no-undef
    throw new ContractError("Task index should be a number");
  }
  const task = tasks[matchIndex];
  // eslint-disable-next-line no-prototype-builtins
  if (task.hasOwnProperty("open")) {
    // get Top count of hash
    let topHash = "";
    let topTId = "";
    let topCt = 0;
    task.hashPayloads.forEach((hash) => {
      if (hash.count > topCt) {
        topCt = hash.count;
        topHash = hash.hashPayload;
      }
    });

    // check the top hash is correct
    if (topCt >= task.hashPayloads.length / 2) {
      // set bounty process
      // 1 discount bounty from requester
      // -- if the owner of scraper didn't enough bounty balance, this scraper will be ignored
      // it will decrease in koii main contract
      // task.prepareDistribution.push({task.owner: task.bounty * -1})
      // 2 set bounty to winner - top 8 nodes
      let deeper = 0;
      const newPrepareDistribution = {
        id: task.uuid + "_" + task.open,
        distribution: {},
        isRewarded: false
      };

      task.payloads.forEach((hash) => {
        if (hash.hashPayload == topHash && deeper < 8) {
          if (deeper === 0) {
            topTId = hash.payloadTxId;
          }
          deeper++;
          // pay bounty to winner
          let qty = Number(task.bounty * Math.pow(2, deeper * -1));
          // if (balances[hash.owner]) balances[hash.owner] += qty;
          // else balances[hash.owner] = qty;
          // task.prepareDistribution.push({hash.owner: qty})
          newPrepareDistribution.distribution[hash.owner] = qty;
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

      if (topHash !== "" && topTId !== "") {
        // update task
        task.hasRanked = true;
        task.tophash = topHash;
        task.tId = topTId;
        task.prepareDistribution.push({ newPrepareDistribution });
      } else {
        task.close = task.close + 720;
        // eslint-disable-next-line no-undef
        throw new ContractError("There is an issue to get distribution");
      }
    } else {
      // not possible audit - update close
      task.close = task.close + 720;
    }
  }
  return { state };
}
