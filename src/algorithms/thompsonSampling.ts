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
    
    // Im Compare-Modus: Nutze lokales temporäres Array statt Pinia Store
    const isCompareMode = algorithmStore.algorithmsCompare;
    const tempInvestments: any[] = [];
    
    // PERFORMANCE-OPTIMIERUNG: Cache für schnelleren Zugriff auf arm_investments
    const stockCache = new Map<any, number[]>();
    for (let i = 0; i < stock.length; i++) {
        stockCache.set(stock[i], []);
    }
    
    algorithmStore.algorithmsInProgress = true;
    for (let t = 0; t < banditStore.possibleInvestments; t++) {
        let sampledValues: number[] = [];
        for (let i = 0; i < stock.length; i++) {
            const returns = stockCache.get(stock[i])!;
            let sampledValue = 0;
            switch (bandit) {
                case 'bernoulli':
                    let successes = 0;
                    let failures = 0;
                    for (let j = 0; j < returns.length; j++) {
                        if (returns[j] === 1) successes++;
                        else failures++;
                    }
                    // Calc Beta
                    const alpha = successes + 1; // +1 is uninformative initialisation
                    const beta = failures + 1;
                    sampledValue = jStat.beta.sample(alpha, beta);
                    break;
                case 'gaussian':
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
            // Normaler Modus: UPDATE CACHE auch hier!
            stockCache.get(chosen_arm)!.push(reward);
            
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
            // UPDATE CACHE: Füge reward zum Cache hinzu
            stockCache.get(chosen_arm)!.push(reward);
            
            // Speichere in tempInvestments für Backup (falls nötig)
            tempInvestments.push({
                stock: chosen_arm,
                greedyReturn: null,
                eGreedyReturn: null,
                thompsonReturn: reward,
                ucbReturn: null,
                gradientReturn: null,
                optimisticInitialReturn: null,
                userAlgorithmReturn: null
            });
            
            let compareReward = reward;
            if (algorithmStore.optimalActions === true) {
                compareReward = chosen_arm.stock.id;
            }
            addThompsonResult('default', compareReward);
        }
    }
    algorithmStore.algorithmsInProgress = false;
}