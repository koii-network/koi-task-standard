/* eslint-disable no-undef */
export default async function addScrapingRequest(state, action) {
  const input = action.input;
  const scrapingRequest = input.scrapingRequest;
  const isCleaner = input.clean || false;
  const koiiContract = state.koiiContract;
  const koiiState = await SmartWeave.contracts.readContractState(koiiContract);
  const balances = koiiState.balances;

  const contractId = SmartWeave.contract.id; // storecat contract id
  const KoiiTasks = koiiState.tasks;
  if (isCleaner) {
    // clear completedTask from tasks
    state.tasks = state.tasks.filter(
      (t) =>
        t.prepareDistribution.length === 0 || !t.prepareDistribution[0].isRewarded
    );
    // update distribution rewards
    const contractTask = KoiiTasks.find((task) => task.txId === contractId);
    if (contractTask) {
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
    }
    // update completed tasks
    for (let index = 0; index < state.tasks.length; index++) {
      const element = tasks[index];
      if (element.prepareDistribution.length === 0) continue;
      if (
        element.prepareDistribution[0].isRewarded &&
        element.hasAudit &&
        element.tId !== ""
      ) {
        const completedTask = {
          uuid: element.uuid,
          owner: element.owner,
          txId: element.tId
        };
        state.completedTasks.push(completedTask);
      }
    }
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
    hasAudit: false,
    tophash: "",
    tId: "",
    payloads: [],
    hashPayloads: [],
    prepareDistribution: []
  };
  state.tasks.push(newTask);
  return { state };
}
