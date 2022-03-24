export function handle(state, action) {
  const input = action.input;
  const caller = action.caller;
  if (input.function === "upload") {
    const hash = input.hash;
    ContractAssert(hash, `No hash specified.`);
    const cid = state.cid;
    var datetime = new Date();
    const date = datetime.toISOString().slice(0, 10);
    const item = {
      hash: hash,
      creator: caller,
      date: date
    };
    console.log(cid.length);
    cid.forEach((element) => {
      console.log("element", element);
      if (element.hash == hash) {
        throw new ContractError(`Hash already exists.`);
      }
    });

    cid.push(item);
    return { state };
  }
}
