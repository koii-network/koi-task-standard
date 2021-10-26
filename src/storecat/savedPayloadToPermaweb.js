export default async function savedPayloadToPermaweb(state, action) {
  const tasks = state.tasks;
  const input = action.input;
  const matchIndex = input.matchIndex;
  const txId = input.txId;
  
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