export async function handle(state, action) {
  const input = action.input;
  //const caller = action.caller;
  if (input.function === "migrate") {
    const nfts = state.nfts;
    const nft = input.nft;
    const validContractSrc = state.validContractSrc;
    const tagNameB64 = "Q29udHJhY3QtU3Jj";
    //const transaction = await SmartWeave.arweave.transactions.get(nft);
    const txInfo = await SmartWeave.unsafeClient.transactions.get(nft);

    const contractSrcTag = txInfo.tags.find((tag) => tag.name === tagNameB64);

    console.log(contractSrcTag);
    console.log(contractSrcTag.value);
    if (validContractSrc.includes(contractSrcTag.value)) {
      const nftState = await SmartWeave.contracts.readContractState(nft);
      console.log(nftState);
      console.log("valid");
      const owners = {};
      let locked = true;
      for (let address in nftState.balances) {
        if (nftState.balances[address] !== 0 && nftState.lock === undefined) {
          owners[address] = nftState.balances[address];
          locked = false;
        }
      }
      nfts[nft] = {
        locked,
        owners
      };
    }
    return { state };
  }

  if (input.function === "register") {
    const contractSrc = input.contractSrc;
    const encodeContractSrc =
      SmartWeave.arweave.utils.stringToB64Url(contractSrc);
    if (state.validContractSrc.includes(encodeContractSrc))
      throw new ContractError("The contract source already registered");
    state.validContractSrc.push(encodeContractSrc);
    return { state };
  }

  throw new ContractError(
    `No function supplied or function not recognised: "${input.function}".`
  );
}
