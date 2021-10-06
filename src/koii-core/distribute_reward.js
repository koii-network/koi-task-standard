export default async function distributeReward(state) {
  const balances = state.balances;
  const tasks = state.tasks;
  const distributionStatus = state.distributionBlock;
  if (distributionStatus > SmartWeave.block.height) {
    throw new ContractError("Distribution already happen");
  }
  const koiiTask = tasks.filter((task) => "bounty" in task);
  await Promise.all(
    tasks.map(async (task) => {
      const contractState = await SmartWeave.contracts
        .readContractState(task.txId)
        .catch((e) => {
          if (e.type !== "TX_NOT_FOUND") throw e;
        });
      if (contractState) {
        const prepareDistribution = contractState.task.prepareDistribution;
        const rewardedBlock = task.rewardedBlock;
        // clean rewarded block
        for (let i = rewardedBlock.length - 1; i >= 0; i--) {
          const distributedBlock = prepareDistribution.find(
            (distribution) => distribution.block === rewardedBlock[i]
          );
          if (distributedBlock === undefined) {
            rewardedBlock.splice(i, 1);
          }
        }
        // filter isRewarded = true and if distribution unRewarded in Main Contract
        const unRewardedPrepareDistribution = prepareDistribution.filter(
          (distribution) =>
            !distribution.isRewarded &&
            !rewardedBlock.includes(distribution.block)
        );
        if (koiiTask.includes(task)) {
          unRewardedPrepareDistribution.forEach((prepareDistribution) => {
            const lockBounty = task.lockBounty[task.owner];
            const taskDistribution = Object.values(
              prepareDistribution.distribution
            ).reduce((preValue, curValue) => preValue + curValue);
            if (lockBounty >= taskDistribution) {
              for (let address in prepareDistribution.distribution) {
                address in balances
                  ? (balances[address] +=
                      prepareDistribution.distribution[address])
                  : (balances[address] =
                      prepareDistribution.distribution[address]);
              }
              rewardedBlock.push(prepareDistribution.block);
              task.lockBounty[task.owner] -= taskDistribution;
            }
          });
        } else {
          unRewardedPrepareDistribution.forEach((prepareDistribution) => {
            for (let address in prepareDistribution.distribution) {
              address in balances
                ? (balances[address] +=
                    prepareDistribution.distribution[address])
                : (balances[address] =
                    prepareDistribution.distribution[address]);
            }
            rewardedBlock.push(prepareDistribution.block);
          });
        }
      }
    })
  );
  state.distributionBlock = SmartWeave.block.height + 600;
  return { state };
}
