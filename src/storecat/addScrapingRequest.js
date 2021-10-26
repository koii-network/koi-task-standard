export default async function addScrapingRequest(state, action) {
  const tasks = state.tasks;
  const input = action.input;
  const scrapingRequest = input.scrapingRequest;
  const koiiContract = state.koiiContract;
  const koiiState = await SmartWeave.contracts.readContractState(koiiContract);
  const balances = koiiState.balances;

  if (!(scrapingRequest.owner in balances)) {
    throw new ContractError(
      "Scraping owner should have minimum stake of " + scrapingRequest.bounty + " koii"
    );
  }
  const balanceOwner = balances[scrapingRequest.owner];
  if (balanceOwner <= Number(scrapingRequest.bounty)) {
    throw new ContractError("Owner koii balance is not enough");
  }

  // call interactWrite func update task
  let task = {
    open: SmartWeave.block.height,
    close: SmartWeave.block.height + 720,
    owner: scrapingRequest.owner,
    uuid: scrapingRequest.uuid,
    bounty: Number(scrapingRequest.bounty) || 1,
    url: scrapingRequest.url,
    hasAudit: false,
    tophash: "",
    hasUploaded: false,
    payloads: [],
    payloadHashs: [],
    prepareDistribution: {
      block: SmartWeave.block.height,
      distribution: {},
      isRewarded: false
    }
  }
  tasks.push(task);
  return { state };
}