import { SmartWeave } from "@weavery/clarity";

export default function addScrapingRequest(state, action) {
  const tasks = state.tasks;
  const caller = action.caller;
  const input = action.input;
  const scrapingRequest = input.scrapingRequest;

  // call interactWrite func update task
  let task = {
    open: SmartWeave.block.height,
    close: SmartWeave.block.height + 720,
    uuid: scrapingRequest.uuid,
    bounty: Number(scrapingRequest.bounty) || 1,
    url: scrapingRequest.url,
    hasAudit: false,
    hasReward: false,
    payloads: []
  }
  tasks.push(task);
  return { state };
}