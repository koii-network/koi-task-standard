export default function proposeSlash(state, action) {
    const caller = action.caller; // the arweave ID who is calling the function
    const input = action.input; // the input action value (data payload, aid, cid)
    const uid = input.uid;
    // checks for UID
    if (!uid) throw new ContractError("Invalid input");
    if (typeof uid !== "string") throw new ContractError("Invalid input format");
    
    // if it passes all the tests, update the state
    state.votes[slash] = uid;
    
    return { state };
  }
  