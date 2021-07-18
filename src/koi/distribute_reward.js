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
      const rewardedPrepareDistribution = prepareDistribution.filter(
        (distribution) => distribution.isRewardAddToMainContract
      );
      // clean rewarded block
      rewardedPrepareDistribution.map((distribution) => {
        if (distribution.isRewardAddToMainContract) {
          const index = rewardedBlock.indexOf(distribution.block);
          if (index > -1) {
            rewardedBlock.splice(index, 1);
          }
        }
      });
      // filter isRewardAddToMainContract = false and if distribution unRewarded in Main Contract
      const unRewardedPrepareDistribution = prepareDistribution.filter(
        (distribution) =>
          !distribution.isRewardAddToMainContract &&
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
