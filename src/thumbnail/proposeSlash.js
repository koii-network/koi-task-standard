export default function proposeSlash(state, action) {
    const votes = state.votes;
    const caller = action.caller; // the arweave ID who is calling the function
    const input = action.input; // the input action value (data payload, aid, cid)
    const uid = input.uid;
    const data = input.data;
    // checks for UID
    if (!uid) throw new ContractError("Invalid input");
    if (typeof uid !== "string") throw new ContractError("Invalid input format");

     // checks for data
     if (!data) throw new ContractError("Invalid input");
     if (typeof data !== "string") throw new ContractError("Invalid input format");
    // checks caller
    if (!caller) throw new ContractError("Invalid input");
    
    // if it passes all the tests, update the state
    const vote = {
      slash:{
        uid: uid,
        data: data
      }
    };
    votes.push(vote);
    return { state };
  }
  