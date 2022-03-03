export function handle(state, action) {
  const input = action.input;
  const caller = action.caller;
  if (input.function === "upload") {
    const hash = input.hash;
    ContractAssert(hash, `No hash specified.`);
    const imageHashArray = state.imageHashArray;
    var datetime = new Date();
    const date = datetime.toISOString().slice(0, 10);
    const item = {
      hash: hash,
      creator: caller,
      voteCount: 0,
      date: date
    };
    // if (imageHashArray.includes(hash)) {
    //   throw new ContractError(`Hash already exists.`);
    // } else {
    //   imageHashArray.push(hash);
    // }
    imageHashArray.push(item);
    return { state };
  }

  if (input.function === "vote") {
    const voting = state.voting;
    const imageHashArray = state.imageHashArray;
    const vote = input.vote;
    ContractAssert(vote, `No vote specified.`);
    var datetime = new Date();
    const date = datetime.toISOString().slice(0, 10);
    console.log("DATE", date);
    //Adding the voter in voting list
    voting.forEach((election) => {
      if (election.date == date) {
        if (election.voters.includes(caller)) {
          throw new ContractError(`Your vote is already recorded.`);
        } else {
          //if (election.date == date) {
          election.voters.push(caller);
          //}
          console.log("ELECTION", election);
        }
      }
    });
    // Updating the vote count  if the vote is yes
    if (vote == "yes") {
      imageHashArray.forEach((candidate) => {
        if (candidate.date == date) {
          candidate.voteCount++;
        }
        console.log("CANDIDATE", candidate);
      });
    } else {
      console.log("Your vote is casted.");
    }
    // const vote = input.vote;
    // if (voting[0].voters.includes(caller)) {
    //   throw new ContractError(`You already voted.`);
    // } else {
    //   var datetime = new Date();
    //   // console.log(datetime.toISOString().slice(0, 10));
    //   // const date = datetime.toISOString().slice(0, 10);

    //   voters.push(caller);
    // }
    return { state };
  }
}
