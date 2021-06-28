export function handle(state, action) {
    const input = action.input;
    const caller = action.caller;
    const owner = state.owner;
    if (input.function === "register") {
      const nftId = input.nftId;
      if (!nftId) throw new ContractError("nftId undefined");
    }
    if (owner !== caller){
     throw new ContractError("Only the owner can register");
    }
    const contractState = await SmartWeave.contracts.readContractState(
       nftId
      );
    if(contractState.balances[caller] !== 1){
    throw new ContractError(`token needs to be locked first.delegate your nft to this address ${state.owner}`);
    }
    const nftIdOnOtherNetwork = input.nftIdOnOtherNetwork;
    
  



}

