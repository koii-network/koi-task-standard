export default function checkDecay(state, action) {
  const input = action.input;
  const decay = state.decay;

  //   const qty = input.qty;
  //   ContractAssert(qty, `No quantity specified.`);

  // check the current block height, and decay the NFT if it is not protected
  let currentBlock = SmartWeave.block.height;
  
  if ( decay.lastDecay > ( currentBlock + decay.period ) ) {
    decay.lastDecay = decay.lastDecay + decay.period; // do not set it to the current block as it can unsync the blocks from degradation
    state.durability = state.durability - decay.rate;
  }

  return { state };
}
