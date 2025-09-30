// "Cold Start" Greedy Algorithm for Bernoulli and Gaussian Bandits
import { bernoulli } from '../bandits/bernoulli.js';
import { gaussian } from '../bandits/gaussian.js';
import { useBanditStore } from '@/stores/bandit';
import { useAlgorithmStore } from '@/stores/algorithms';

const val_epsilon = 0.1;

export function greedy_bernoulli() {
    const bandit = 'bernoulli';
    const epsilon = false;
    xGreedy(bandit, epsilon);
}

export function eGreedy_bernoulli() {
    const bandit = 'bernoulli';
    const epsilon = true;
    xGreedy(bandit, epsilon);
}

export function greedy_gaussian() {
    const bandit = 'gaussian';
    const epsilon = false;
    xGreedy(bandit, epsilon);
}

export function eGreedy_gaussian() {
    const bandit = 'gaussian';
    const epsilon = true;
    xGreedy(bandit, epsilon);
}

function xGreedy(bandit, epsilon) {
    const banditStore = useBanditStore();
    const stock = banditStore.selectedStocks;
    const algorithmStore = useAlgorithmStore();
    
    // Try the arm with best success rate until anotherone is better (greedy)
    // OR try greedy but with probability e a random arm (e-greedy)
    let best_arm_index = 0;
    algorithmStore.algorithmsInProgress = true;
    for (let t = 0; t < banditStore.possibleInvestments; t++) {
        if (epsilon && Math.random() < val_epsilon) {
            best_arm_index = Math.floor(Math.random() * stock.length);
        }
        else {
            // set comparison-value to first so it can be compared
            // ! Necessary bc the set value has changed in the loop
            let best_arm_value = algorithmStore.investmentsGreedy[0]?.greedyReturn || 0;
            best_arm_index = 0; // Start with first stock
            for (let i = 0; i < algorithmStore.investmentsGreedy.length; i++) {
                const current_value = algorithmStore.investmentsGreedy[i].greedyReturn || 0;
                if (current_value > best_arm_value) {
                    best_arm_value = current_value;
                    // Find the index of this stock in the selectedStocks array
                    const stockIndex = stock.findIndex(s => s === algorithmStore.investmentsGreedy[i].stock);
                    if (stockIndex !== -1) {
                        best_arm_index = stockIndex;
                    }
                }
            }
        }

        // Ensure best_arm_index is valid
        if (best_arm_index >= stock.length) {
            best_arm_index = 0;
        }

        const chosen_arm = stock[best_arm_index];
        if (!chosen_arm) {
            continue; // Skip this iteration if no valid arm
        }

        switch (bandit) {
            case 'bernoulli':
                algorithmStore.investmentsGreedy.push({
                    stock: chosen_arm,
                    greedyReturn: bernoulli(chosen_arm.bernoulli_param) ? 1 : 0  // Convert boolean to number
                });
                break;
            case 'gaussian':
                algorithmStore.investmentsGreedy.push({
                    stock: chosen_arm,
                    greedyReturn: gaussian(chosen_arm.gaussian_param)
                });
                break;
        }
    }
    algorithmStore.algorithmsInProgress = false;
}

// function init_array_arms(arms) {
    // const greedy = [];

    // arms.forEach(arm => {
    //     greedy.push({
    //         name: arm.name,
    //         trial_result: [],
    //         bandit_result: 0
    //     });
    // });

    // return greedy;

    // Can be used if for alternatives to cold start
// }