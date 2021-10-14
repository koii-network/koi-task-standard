export default function addScrapingRequest(state, action) {
  const tasks = state.tasks;
  const caller = action.caller;
  const input = action.input;
  const scrapingRequest = input.scrapingRequest;

  // call interactWrite func update task
  let task = {
    "uuid": scrapingRequest.uuid,
    "bounty": Number(scrapingRequest.bounty) || 1,
    "url": scrapingRequest.url,
    "isReward": false,
    "payloads": []
  }
}