export default async function distributeReward(state) {
  const balances = state.balances;
  const tasks = state.tasks;
  const distributionStatus = state.distributionBlock;
  if (distributionStatus > SmartWeave.block.height) {
    throw new ContractError("Distribution already happen");
  }
  for (const task of tasks) {
    const contractState = await SmartWeave.contracts
      .readContractState(task.txId)
      .catch((e) => {
        if (e.type !== "TX_NOT_FOUND") throw e;
      });
    if (contractState) {
      // Filter tasks with prepareDistribution
      const tasksWithDistribution = contractState.tasks.filter(
        (subtask) => subtask.prepareDistribution.length !== 0
      );

      // clean lockedBounty for completed task
      const taskIds = Object.keys(task.lockedBounty);
      for (let taskId of taskIds) {
        const completeTask = contractState.completedTasks.find(
          (task) => task.uuid === taskId
        );
        if (completeTask) {
          delete task.lockedBounty[taskId];
        }
      }

      // Distribute Rewards
      tasksWithDistribution.forEach((subtask) => {
        const prepareDistribution = subtask.prepareDistribution;
        const rewardedTaskId = task.rewardedTaskId;
        // clean rewarded block
        for (let i = rewardedTaskId.length - 1; i >= 0; i--) {
          const distributedTask = prepareDistribution.find(
            (distribution) => distribution.id === rewardedTaskId[i]
          );
          if (!distributedTask || distributedTask.isRewarded) {
            rewardedTaskId.splice(i, 1);
          }
        }
        // filter isRewarded = true and if distribution unRewarded in Main Contract
        const unRewardedPrepareDistribution = prepareDistribution.filter(
          (distribution) =>
            !distribution.isRewarded &&
            !rewardedTaskId.includes(distribution.id)
        );
        if ("bounty" in subtask) {
          let bounty = subtask.bounty;
          unRewardedPrepareDistribution.forEach((prepareDistribution) => {
            const taskDistribution = Object.values(
              prepareDistribution.distribution
            ).reduce((preValue, curValue) => preValue + curValue);
            if (bounty >= taskDistribution) {
              for (let address in prepareDistribution.distribution) {
                address in balances
                  ? (balances[address] +=
                      prepareDistribution.distribution[address])
                  : (balances[address] =
                      prepareDistribution.distribution[address]);
              }
              rewardedTaskId.push(prepareDistribution.id);
              bounty -= taskDistribution;
            }
          });
        } else if (
          task.name === "Attention_Game" &&
          task.owner === SmartWeave.contract.owner
        ) {
          unRewardedPrepareDistribution.forEach((prepareDistribution) => {
            for (let address in prepareDistribution.distribution) {
              address in balances
                ? (balances[address] +=
                    prepareDistribution.distribution[address])
                : (balances[address] =
                    prepareDistribution.distribution[address]);
            }
            rewardedTaskId.push(prepareDistribution.id);
          });
        }
      });
    }
  }
  //600
  state.distributionBlock = SmartWeave.block.height + 40;
  return { state };
}
