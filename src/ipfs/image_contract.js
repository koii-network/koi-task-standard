export function handle(state, action) {
  const input = action.input;
  //const caller = action.caller;
  if (input.function === "upload") {
    const hash = input.hash;
    ContractAssert(hash, `No hash specified.`);
    const imageHashArray = state.imageHashArray;
    if (imageHashArray.includes(hash)) {
      throw new ContractError(`Hash already exists.`);
    } else {
      imageHashArray.push(hash);
    }
    return { state };
  }
}
