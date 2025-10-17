import { bernoulli } from '../bandits/bernoulli.js';
import { gaussian } from '../bandits/gaussian.js';
import { useBanditStore } from '@/stores/bandit';
import { useAlgorithmStore } from '@/stores/algorithms';
import jStat from "jstat";
import { addThompsonResult } from '@/stores/compare_algos_store';

export function thompsonSampling_bernoulli() {
    const bandit = 'bernoulli';
    thompsonSampling(bandit);
}

export function thompsonSampling_gaussian() {
    const bandit = 'gaussian';
    thompsonSampling(bandit);
}

function thompsonSampling(bandit: 'bernoulli' | 'gaussian') {
    const banditStore = useBanditStore();
    const stock = banditStore.selectedStocks;
    const algorithmStore = useAlgorithmStore();
    
    algorithmStore.algorithmsInProgress = true;
    for (let t = 0; t < banditStore.possibleInvestments; t++) {
        let sampledValues: number[] = [];
        for (let i = 0; i < stock.length; i++) {
            const arm_investments = algorithmStore.investmentsThompson.filter(inv => inv.stock === stock[i]);
            let sampledValue = 0;
            switch (bandit) {
                case 'bernoulli':
                    const successes = arm_investments.filter(inv => inv.thompsonReturn === 1).length;
                    const failures = arm_investments.filter(inv => inv.thompsonReturn === 0).length;
                    // Calc Beta
                    const alpha = successes + 1; // +1 is uninformative initialisation
                    const beta = failures + 1;
                    sampledValue = jStat.beta.sample(alpha, beta);
                    break;
                case 'gaussian':
                    const returns = arm_investments.map(inv => inv.thompsonReturn!);
                    const mean = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
                    const variance = returns.length > 1 ? returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1) : 1;
                    // Calc Normal
                    sampledValue = jStat.normal.sample(mean, Math.sqrt(variance));
                    break;
            }
            sampledValues.push(sampledValue);
        }

        // Select arm with highest sampled value
        let best_arm_index = 0;
        let best_sampled_value = sampledValues[0];
        for (let i = 1; i < sampledValues.length; i++) {
            if (sampledValues[i] > best_sampled_value) {
                best_sampled_value = sampledValues[i];
                best_arm_index = i;
            }
        }

        const chosen_arm = stock[best_arm_index];
        let reward = 0;
        switch (bandit) {
            case 'bernoulli':
                reward = bernoulli(chosen_arm.bernoulli_param) ? 1 : 0;
                break;
            case 'gaussian':
                reward = gaussian(chosen_arm.gaussian_param);
                break;
        }

        if (algorithmStore.algorithmsCompare === false) {
            algorithmStore.investmentsThompson.push({
                stock: chosen_arm,
                greedyReturn: null,
                eGreedyReturn: null,
                thompsonReturn: reward,
                ucbReturn: null,
                gradientReturn: null,
                optimisticInitialReturn: null,
                userAlgorithmReturn: null
            });
        } else {
            addThompsonResult('default', reward);
        }
    }
    algorithmStore.algorithmsInProgress = false;
}