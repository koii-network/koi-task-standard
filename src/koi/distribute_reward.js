export default async function distributeReward(state) {
  const balances = state.balances;
  const tasks = state.tasks;

  await Promise.all(
    tasks.map(async (task) => {
      const contractState = await SmartWeave.contracts.readContractState(
        task.txId
      );
      const prepareDistribution = contractState.task.prepareDistribution;
      const rewardedBlock = task.rewardedBlock;

      // clean rewarde block
      for (let i = rewardedBlock.length - 1; i >= 0; i--) {
        const distributedBlock = prepareDistribution.find(
          (distribution) => distribution.block === rewardedBlock[i]
        );
        if (distributedBlock === undefined) {
          rewardedBlock.splice(i, 1);
        }
      }

      // filter isRewarded = false and if distribution unRewarded in Main Contract
      const unRewardedPrepareDistribution = prepareDistribution.filter(
        (distribution) =>
          !distribution.isRewarded &&
          !rewardedBlock.includes(distribution.block)
      );

      unRewardedPrepareDistribution.forEach((prepareDistribution) => {
        for (let address in prepareDistribution.distribution) {
          if (address in balances) {
            balances[address] += prepareDistribution.distribution[address];
          } else {
            balances[address] = prepareDistribution.distribution[address];
          }
        }
        rewardedBlock.push(prepareDistribution.block);
      });
    })
  );

  return { state };
}
