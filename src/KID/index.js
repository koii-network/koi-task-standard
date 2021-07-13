export function handle(state, action) {
  const input = action.input;
  const caller = action.caller;

  if (input.function === "updateKID") {
    const name = input.name;
    const description = input.description;
    const avatar = input.avatar;
    const Arweave = input.addresses ? input.addresses.Arweave : null;
    const Ethereum = input.addresses ? input.addresses.Ethereum : null;
    const Polkadot = input.addresses ? input.addresses.Polkadot : null;
    const link = input.link;
    ContractAssert(
      state.addresses ? state.addresses.Arweave : null,
      `Arweave address doesn't exist.`
    );
    ContractAssert(
      state.addresses.Arweave === caller,
      `The owner can only update KID.`
    );
    if (name) {
      state.name = name;
    }
    if (description) {
      state.description = description;
    }
    if (avatar) {
      state.avatar = avatar;
    }
    if (Arweave) {
      state.addresses.Arweave = Arweave;
    }
    if (Ethereum) {
      state.addresses.Ethereum = Ethereum;
    }
    if (Polkadot) {
      state.addresses.Polkadot = Polkadot;
    }
    if (link) {
      state.link = link;
    }
    return { state };
  }

  throw new ContractError(
    `No function supplied or function not recognised: "${input.function}".`
  );
}
