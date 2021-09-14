# Koii Contract

koii Contract is a smartweave contract,Smartweave is a new smart contract protocol, it takes a different approach: instead of requiring network nodes to execute smart contract code, a system of “lazy evaluation” is employed, pushing the computation of transaction validation to users of the smart contract. Koii Contract enable any one who has koii token to register a task and to run registered tasks and rewarded based on the payload they been submitted.

## Contract Deployment

`yarn deploy [koi]`

## Contract Source

#### Transfer

- takes `quantity` and `target` as input.

- Allow anyone who have koii balance to transfer.

```bash
  export default function transfer(state, action) {
  const balances = state.balances;
  const caller = action.caller;
  const input = action.input;
  const target = input.target;
  const qty = input.qty;

  if (!target) throw new ContractError("No target specified");
  if (!Number.isInteger(qty))
    throw new ContractError('Invalid value for "qty". Must be an integer');
  if (qty <= 0 || caller === target)
    throw new ContractError("Invalid token transfer");
  if (balances[caller] < qty) {
    throw new ContractError(
      `Caller balance not high enough to send ${qty} token(s)!`
    );
  }

  balances[caller] -= qty;
  if (target in balances) balances[target] += qty;
  else balances[target] = qty;

  return { state };
}
```

#### Stake

- takes `quantity` as input

- the `Caller` of that function should have enough koii balance, if the koii balance is less than the stake quantity the transaction will fail.

```bash
export default function stake(state, action) {
  const balances = state.balances;
  const stakes = state.stakes;
  const caller = action.caller;
  const input = action.input;
  const qty = input.qty;
  if (!Number.isInteger(qty))
    throw new ContractError('Invalid value for "qty". Must be an integer');
  if (qty <= 0) throw new ContractError("Invalid stake amount");
  if (balances[caller] < qty) {
    throw new ContractError(
      "Balance is too low to stake that amount of tokens"
    );
  }
  balances[caller] -= qty;

  caller in stakes
    ? stakes[caller].push({ value: qty, block: SmartWeave.block.height })
    : (stakes[caller] = [{ value: qty, block: SmartWeave.block.height }]);
  return { state };
}
```

#### Mint

- takes `quantity` as input.

- Only the owner of the koii Contract can access it.

- mint Koii tokens.

```bash
export default function mint(state, action) {
  const owner = state.owner;
  const balances = state.balances;
  const caller = action.caller;
  const input = action.input;

  const target = input.target;
  const qty = input.qty;

  if (!target) throw new ContractError("No target specified");
  if (!Number.isInteger(qty))
    throw new ContractError('Invalid value for "qty". Must be an integer');
  if (owner !== caller)
    throw new ContractError("Only the owner can mint new tokens");

  if (balances[target]) balances[target] += qty;
  else balances[target] = qty;

  return { state };
}


```

#### Withdraw

- takes `quantity` as input.

- it withdraw staked koi tokens which are 14 days old or older and add the tokens to the `caller address` balance.

```bash
export default function withdraw(state, action) {
  const balances = state.balances;
  const stakes = state.stakes;
  const caller = action.caller;
  const input = action.input;
  let qty = input.qty;
  if (!(caller in stakes)) {
    throw new ContractError(`This ${caller}adress hasn't staked`);
  }
  if (!Number.isInteger(qty)) {
    throw new ContractError('Invalid value for "qty". Must be an integer');
  }

  if (qty <= 0) throw new ContractError("Invalid stake withdrawal amount");

  const callerStake = stakes[caller];

  const avaliableTokenToWithDraw = callerStake.filter(
    (stake) => SmartWeave.block.height > stake.block + 10080
  );
  const total = avaliableTokenToWithDraw.reduce(
    (acc, curVal) => acc + curVal.value,
    0
  );
  if (qty > total) {
    throw new ContractError("Stake is not ready to be released");
  }
  // If Stake is 14 days old can be withdraw
  for (let stake of avaliableTokenToWithDraw) {
    if (qty <= stake.value) {
      stake.value -= qty;
      balances[caller] += qty;
      break;
    }
    if (qty > stake.value) {
      balances[caller] += stake.value;
      qty -= stake.value;
      stake.value -= stake.value;
    }
  }

  return { state };
}



```

#### RegisterTask

- takes `taskname`, `taskTxId` and `koiReward` as input.

- Register Tasks to the Koii Contract state. The koiReward is locked as a bounty and this bounty is taken from the task owner balance and rewarded to those who do the task.

```bash
export default async function registerTask(state, action) {
  const balances = state.balances;
  const caller = action.caller;
  const input = action.input;
  const taskName = input.taskName;
  const taskTxId = input.taskTxId;
  const koiReward = input.koiReward;
  if (caller !== state.owner) {
    throw new ContractError("Only owner can register a task");
  }
  if (!taskTxId) throw new ContractError("No txid specified");
  if (koiReward && balances[caller] < koiReward + 1)
    throw new ContractError("Your Balance is not enough");
  const txId = state.tasks.find((task) => task.txId === taskTxId);
  if (txId !== undefined) {
    throw new ContractError(`task with ${txId}id is already registered `);
  }
  // Required to start caching this task state in kohaku
  await SmartWeave.contracts.readContractState(taskTxId);
  koiReward
    ? (state.tasks.push({
        owner: caller,
        name: taskName,
        txId: taskTxId,
        bounty: koiReward,
        rewardedBlock: [],
        lockBounty: {
          [caller]: koiReward
        }
      }),
      (balances[caller] -= koiReward))
    : state.tasks.push({
        owner: caller,
        name: taskName,
        txId: taskTxId,
        rewardedBlock: []
      });

  return { state };
}

```

#### DeregisterTask

- takes `taskTxId` as input.

- only owner of the task can deregister the task from the koii contract.

```bash
export default function deregisterTask(state, action) {
  const caller = action.caller;
  const txId = action.input.taskTxId;
  const task = state.tasks.find(
    (task) => task.txId === txId && task.owner === caller
  );
  if (task === undefined) {
    throw new ContractError(
      `task with ${txId} Id and ${caller} owner did not register`
    );
  }
  const index = state.tasks.indexOf(task);
  state.tasks.splice(index, 1);
  return { state };
}

```

#### BurnKoi

- takes `contractTxId`, `contentTxId` and `contentType` as input.

- register contents in koii contract state with their full information in temporary array and later this contents will be migrated to their respective contracts. The purpose of this function is to save content creators from interacting two contracts.

```bash
export default async function burnKoi(state, action) {
  const balances = state.balances;
  const caller = action.caller;
  const preRegisterDatas = state.preRegisterDatas;
  const input = action.input;
  const contractId = input.contractId;
  const contentType = input.contentType;
  const contentTxId = input.contentTxId;

  if (!(caller in balances) || balances[caller] < 1)
    throw new ContractError("you do not have enough koi");
  --balances[caller]; // burn 1 koi per registration
  preRegisterDatas.push({
    contractId: contractId,
    insertBlock: SmartWeave.block.height,
    content: { [contentType]: contentTxId },
    owner: caller
  });
  return { state };
}

```

#### CleanPreRegister

- doesn't take an input.

- cleans preRegister array after the contents are migrated to their respective contracts.

```bash
export default async function cleanPreRegister(state) {
  const preRegisterDatas = state.preRegisterDatas;

  const contractIds = [];
  preRegisterDatas.forEach((preRegisterData) => {
    if ("nft" in preRegisterData.content) {
      if (!contractIds.includes(preRegisterData.contractId)) {
        contractIds.push(preRegisterData.contractId);
      }
    }
  });

  await Promise.allSettled(
    contractIds.map(async (contractId) => {
      const contractState = await SmartWeave.contracts.readContractState(
        contractId
      );
      const registeredNfts = Object.values(contractState.nfts).reduce(
        (acc, curVal) => acc.concat(curVal),
        []
      );
      state.preRegisterDatas = state.preRegisterDatas.filter(
        (preRegisterData) =>
          !registeredNfts.includes(preRegisterData.content.nft)
      );
    })
  );
  return { state };
}

```

## Testing Contract

`yarn build`

- `node test/koi.test.js `
