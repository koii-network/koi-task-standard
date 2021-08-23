export default async function distributeReward(state) {
  const balances = state.balances;
  const tasks = state.tasks;
  const koiiTask = tasks.filter((task) => "bounty" in task);

  await Promise.allSettled(
    tasks.map(async (task) => {
      const contractState = await SmartWeave.contracts.readContractState(
        task.txId
      );
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
          const lockBounty = task.bounty;
          const taskDistribution = Object.values(
            prepareDistribution.distribution
          ).reduce((preValue, curValue) => preValue + curValue);
          console.log(taskDistribution);
          if (lockBounty === taskDistribution) {
            for (let address in prepareDistribution.distribution) {
              address in balances
                ? (balances[address] +=
                    prepareDistribution.distribution[address])
                : (balances[address] =
                    prepareDistribution.distribution[address]);
            }
            rewardedBlock.push(prepareDistribution.block);
            task.bounty = 0;
            delete task.lockBounty;
          }
        });
      } else {
        unRewardedPrepareDistribution.forEach((prepareDistribution) => {
          for (let address in prepareDistribution.distribution) {
            address in balances
              ? (balances[address] += prepareDistribution.distribution[address])
              : (balances[address] = prepareDistribution.distribution[address]);
          }
          rewardedBlock.push(prepareDistribution.block);
        });
      }
    })
  );

  return { state };
}
