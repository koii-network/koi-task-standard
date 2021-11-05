// The Audit function can be included optionall as a way of invoking a stake slashing behavior to penalize bad actors

export default function proposeUpdate(state, action) {
    const thumbnails = state.votes;
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
    if (cid.length !== 46) {
      throw new ContractError("cid should have 46 characters");
    }

    // checks caller
    if (!caller) throw new ContractError("Invalid input");
    if (caller !== "oDApIgwavkt2Ks2egnIF27iMMLMaVY41raK2l07ONp0") {
      throw new ContractError("caller should be Soma");
    }


    const thumbnail = {
      update: { 
        aid: aid,
        cid: cid
      }
    };
    thumbnails.push(thumbnail);
    return { state };
  }
  
 