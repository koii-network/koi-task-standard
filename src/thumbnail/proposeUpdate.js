// The Audit function can be included optionall as a way of invoking a stake slashing behavior to penalize bad actors

export default function proposeUpdate(state, action) {
    const votes = state.votes;
    const caller = action.caller; // the arweave ID who is calling the function
    const input = action.input; // the input action value (data payload, aid, cid)
    const aid = input.aid;
    const cid = input.cid;
    // checks for AID
    if (!aid) throw new ContractError("Invalid input");
    if (typeof aid !== "string") throw new ContractError("Invalid input format");
    if (aid.length !== 43) {
      throw new ContractError("aid should have 43 characters");
    }

    // repeat checks for CID HERE
    if (!cid) throw new ContractError("Invalid input");
    if (typeof cid !== "string") throw new ContractError("Invalid input format");
    if (aid.length !== 46) {
      throw new ContractError("cid should have 46 characters");
    }

    if (SmartWeave.block.height > state.task.open + 600) {
      throw new ContractError("thumbnail is closed. wait for another round");
    }
    const triggeredVote = votes.find((vote) => vote.id == id);
    if (triggeredVote !== undefined) {
      throw new ContractError(`Vote is triggered with ${id} id`);
    }
    const vote = {
      aid: aid,
      cud: cid,
      status: "active",
      voteTrigger: caller,
      yays: 0,
      nays: 0,
      votersList: [],
      bundlers: {}
    };
    votes.push(vote);
    return { state };
  }
  