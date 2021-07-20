const smartweave = require("smartweave");
const { normalizeContractSource } = require("smartweave/lib/utils");
const { SmartWeaveGlobal } = require("smartweave/lib/smartweave-global");
const { BigNumber } = require("bignumber.js");
const clarity = require("@weavery/clarity");

/**
 *
 * @param {*} contractId
 * @returns
 */
function readContractState(contractId) {
  return JSON.parse(process.env[contractId]);
}

/**
 *
 * @param {*} contractId
 * @param {*} state
 */
function writeContractState(contractId, state) {
  process.env[contractId] = JSON.stringify(state);
}

/**
 * Does a dry run of an interaction with a local contract state and source
 * @param {Arweave} arweave     Arweave client instance
 * @param {string} contractSrc  Contract source code
 * @param {JWKInterface} wallet Wallet used to sign the transaction
 * @param {any} input           Interaction input object
 * @param {any} state           Contract state to be interacted
 * @param {string} from         Source address of the interaction
 * @returns {Promise<Void>}
 */
async function interactWrite(
  arweave,
  contractSrc,
  wallet,
  input,
  state,
  from,
  contractId,
  contractOwner = null
) {
  const contract_info = createContractExecutionEnvironment(
    arweave,
    contractSrc,
    contractId,
    contractOwner
  );
  const res = await smartweave.interactWriteDryRun(
    arweave,
    wallet,
    undefined,
    input,
    undefined,
    undefined,
    undefined,
    state,
    from,
    contract_info
  );

  if (res.result) return res.result;
  writeContractState(contractId, res.state);
}

/**
 *
 * @param {*} arweave
 * @param {*} contractSrc
 * @param {*} contractId
 * @param {*} contractOwner
 * @returns
 */
function createContractExecutionEnvironment(
  arweave,
  contractSrc,
  contractId,
  contractOwner
) {
  const returningSrc = normalizeContractSource(contractSrc);
  const swGlobal = new SmartWeaveGlobal(arweave, {
    id: contractId,
    owner: contractOwner
  });

  swGlobal.contracts.readContractState = readContractState;
  const getContractFunction = new Function(returningSrc); // eslint-disable-line

  return {
    handler: getContractFunction(swGlobal, BigNumber, clarity),
    swGlobal
  };
}

module.exports = {
  readContractState,
  writeContractState,
  interactWrite
};
