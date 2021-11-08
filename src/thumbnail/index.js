// The index.js file handles compiling the pieces of the contract into a single Smartweave contract file.

// import submitDistribution from "./submit_distribution";
// import audit from "./audit";
import proposeUpdate from "./proposeUpdate";
import proposeSlash from "./proposeSlash";


// const handlers = [
//   submitDistribution,
//   audit,
//   proposeUpdate,
//   proposeSlash
// ];
const handlers = [
  proposeUpdate,
  proposeSlash
];

export async function handle(state, action) {
  const handler = handlers.find((fn) => fn.name === action.input.function);
  if (handler) return await handler(state, action);
  throw new ContractError(`Invalid function: "${action.input.function}"`);
}
