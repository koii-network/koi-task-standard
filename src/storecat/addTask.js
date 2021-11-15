/* eslint-disable no-undef */
export default async function addScrapingRequest(state, action) {
  const input = action.input;
  const scrapingRequest = input.scrapingRequest;
  const isCleaner = input.scrapingRequest.clean || false;
  const koiiContract = state.koiiContract;
  const koiiState = await SmartWeave.contracts.readContractState(koiiContract);
  const balances = koiiState.balances;
  const contractId = SmartWeave.contract.id; // storecat contract id
  const KoiiTasks = koiiState.tasks;
  const contractTask = KoiiTasks.find((task) => task.txId === contractId);
  if (!contractTask)
    throw new ContractError("contract not found in the koii core contract");

  // check if the bounty is locked
  if (
    !(scrapingRequest.uuid in contractTask.lockedBounty) ||
    contractTask.lockedBounty[scrapingRequest.uuid][scrapingRequest.owner] <
      scrapingRequest.bounty
  )
    throw new ContractError(
      "Bounties are not locked or locked bounties are less than the bounty add in the scrappingRequest"
    );
  if (isCleaner) {
    // update distribution rewards
    for (let task of state.tasks) {
      task.prepareDistribution.forEach((distribution) => {
        if (
          contractTask.rewardedTaskId.includes(distribution.id) &&
          !distribution.isRewarded
        ) {
          distribution.isRewarded = true;
        }
      });
    }
    // update completed tasks
    for (let index = 0; index < state.tasks.length; index++) {
      const element = state.tasks[index];
      if (element.prepareDistribution.length === 0) continue;
      if (
        element.prepareDistribution[0].isRewarded &&
        element.hasRanked &&
        element.txId !== ""
      ) {
        const completedTask = {
          uuid: element.uuid,
          owner: element.owner,
          txId: element.txId
        };
        state.completedTasks.push(completedTask);
      }
    }
    // clear completedTask from tasks
    state.tasks = state.tasks.filter(
      (t) =>
        t.prepareDistribution.length === 0 ||
        !t.prepareDistribution[0].isRewarded
    );
  }

  if (!(scrapingRequest.owner in balances)) {
    throw new ContractError(
      "Scraping owner should have minimum stake of " +
        scrapingRequest.bounty +
        " koii"
    );
  }
  const balanceOwner = balances[scrapingRequest.owner];
  if (balanceOwner <= Number(scrapingRequest.bounty)) {
    throw new ContractError("Owner koii balance is not enough");
  }

  // call interactWrite func update task
  const newTask = {
    open: SmartWeave.block.height,
    close: SmartWeave.block.height + 720,
    owner: scrapingRequest.owner,
    uuid: scrapingRequest.uuid,
    bounty: Number(scrapingRequest.bounty) || 1,
    url: scrapingRequest.websiteUrl,
    hasRanked: false,
    txId: "",
    payloads: [],
    hashPayloads: [],
    prepareDistribution: []
  };
  state.tasks.push(newTask);
  return { state };
}
