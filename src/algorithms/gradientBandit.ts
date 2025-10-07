import { bernoulli } from '../bandits/bernoulli.js';
import { gaussian } from '../bandits/gaussian.js';
import { useBanditStore } from '@/stores/bandit';
import { useAlgorithmStore } from '@/stores/algorithms';


const alpha = 0.1;

export function gradientBandit_bernoulli() {
    const bandit = 'bernoulli';
    gradientBandit(bandit);
}

export function gradientBandit_gaussian() {
    const bandit = 'gaussian';
    gradientBandit(bandit);
}

export function gradientBandit(bandit: 'bernoulli' | 'gaussian') {
    const banditStore = useBanditStore();
    const stock = banditStore.selectedStocks;
    const algorithmStore = useAlgorithmStore();

    // uniform Policy init
    stock.forEach(stock => {
        algorithmStore.investmentsGradient.push({
            stock: stock,
            greedyReturn: null,
            thompsonReturn: null,
            ucbReturn: null,
            gradientReturn: 0,
            optimisticInitialReturn: null,
            userAlgorithmReturn: null
        });
    });

    let H: number[] = new Array(stock.length).fill(0);
    let avgReward = 0;

    algorithmStore.algorithmsInProgress = true;
    for (let t = 0; t < banditStore.possibleInvestments; t++) {
        
        const expH = H.map(h => Math.exp(h));
        const sumExpH = expH.reduce((a, b) => a + b, 0);
        const probs = expH.map(v => v / sumExpH);

        let r = Math.random();
        let cumulativeProb = 0;
        let chosen_arm_index = 0;
        for (let i = 0; i < probs.length; i++) {
            cumulativeProb += probs[i];
            if (r < cumulativeProb) {
                chosen_arm_index = i;
                break;
            }
        }

        const chosen_arm = stock[chosen_arm_index];
        let reward = 0;
        switch (bandit) {
            case 'bernoulli':
                reward = bernoulli(chosen_arm.bernoulli_param) ? 1 : 0;
                break;
            case 'gaussian':
                reward = gaussian(chosen_arm.gaussian_param);
                break;
        }

        avgReward += (reward - avgReward) / (t + 1);

        for (let i = 0; i < H.length; i++) {
            if (i === chosen_arm_index) {
                H[i] += alpha * (reward - avgReward) * (1 - probs[i]);
            } else {
                H[i] -= alpha * (reward - avgReward) * probs[i];
            }
        }

        algorithmStore.investmentsGradient.push({
            stock: chosen_arm,
            greedyReturn: null,
            thompsonReturn: null,
            ucbReturn: null,
            gradientReturn: reward,
            optimisticInitialReturn: null,
            userAlgorithmReturn: null
        });
    }
    algorithmStore.algorithmsInProgress = false;
}