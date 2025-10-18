// "Cold Start" Greedy Algorithm for Bernoulli and Gaussian Bandits
import { bernoulli } from '../bandits/bernoulli.js';
import { gaussian } from '../bandits/gaussian.js';
import { useBanditStore } from '@/stores/bandit';
import { useAlgorithmStore } from '@/stores/algorithms';
import { addGreedyResult, addEGreedyResult, addOIVResult } from '@/stores/compare_algos_store';
import { setParamAlgo } from '@/stores/parameter_algos.ts';

export function greedy_bernoulli() {
    const bandit = 'bernoulli';
    const epsilon = false;
    xGreedy(bandit, 'greedy');
}

export function eGreedy_bernoulli() {
    const bandit = 'bernoulli';
    const epsilon = true;
    xGreedy(bandit, 'eGreedy');
}

export function OIV_bernoulli() {
    const bandit = 'bernoulli';
    xGreedy(bandit, 'OIV');
}

export function greedy_gaussian() {
    const bandit = 'gaussian';
    const epsilon = false;
    xGreedy(bandit, 'greedy');
}

export function eGreedy_gaussian() {
    const bandit = 'gaussian';
    const epsilon = true;
    xGreedy(bandit, 'eGreedy');
}

export function OIV_gaussian() {
    const bandit = 'gaussian';
    xGreedy(bandit, 'OIV');
}

function xGreedy(bandit: 'bernoulli' | 'gaussian', algorithm: 'greedy' | 'eGreedy' | 'OIV') {
    const banditStore = useBanditStore();
    const stock = banditStore.selectedStocks;
    const algorithmStore = useAlgorithmStore();
    let param = 0;
    if (algorithm !== 'greedy') {
        param = setParamAlgo(algorithm);
    }
    
    // Inits for algorithms
    let best_arm_index = 0;
    let avg_result = 0;
    let stock_investments = [];
    let sum = 0;

    // Im Compare-Modus: Nutze lokales temporäres Array statt Pinia Store
    const isCompareMode = algorithmStore.algorithmsCompare;
    const tempInvestments: any[] = [];

    algorithmStore.algorithmsInProgress = true;

    // Try the arm with best success rate until anotherone is better (greedy)
    // OR try greedy but with probability e a random arm (e-greedy)
    // OR try greedy with optimistic initial value (OIV)
    for (let t = 0; t < banditStore.possibleInvestments; t++) {
        if (algorithm === 'eGreedy' && Math.random() < param) {
            best_arm_index = Math.floor(Math.random() * stock.length);
        }
        else {
            // Calculate average for each arm and select the best
            let best_arm_value = -Infinity;
            best_arm_index = 0;
            for (let i = 0; i < stock.length; i++) {
                switch (algorithm) {
                    // Calc average reward for each stock based on algorithm
                    case 'greedy':
                        if (isCompareMode) {
                            stock_investments = tempInvestments.filter(inv => inv.stock === stock[i]);
                        } else {
                            stock_investments = algorithmStore.investmentsGreedy.filter(inv => inv.stock === stock[i]);
                        }
                        if (stock_investments.length > 0) {
                            sum = stock_investments.reduce((acc, inv) => acc + (inv.greedyReturn || 0), 0);
                            avg_result = sum / stock_investments.length;
                        } else {
                            avg_result = 0;
                        }
                        break;
                    case 'eGreedy':
                        if (isCompareMode) {
                            stock_investments = tempInvestments.filter(inv => inv.stock === stock[i]);
                        } else {
                            stock_investments = algorithmStore.investmentsEGreedy.filter(inv => inv.stock === stock[i]);
                        }
                        if (stock_investments.length > 0) {
                            sum = stock_investments.reduce((acc, inv) => acc + (inv.eGreedyReturn || 0), 0);
                            avg_result = sum / stock_investments.length;
                        } else {
                            avg_result = 0;
                        }
                        break;
                    case 'OIV':
                        if (isCompareMode) {
                            stock_investments = tempInvestments.filter(inv => inv.stock === stock[i]);
                        } else {
                            stock_investments = algorithmStore.investmentsOptimisticInitial.filter(inv => inv.stock === stock[i]);
                        }
                        if (stock_investments.length === 0) {
                            avg_result = param; // Optimistic initial value
                        } else {
                            sum = stock_investments.reduce((acc, inv) => acc + (inv.optimisticInitialReturn || 0), 0);
                            avg_result = sum / stock_investments.length;
                        }
                        break;
                }

                // Compare average reward of current stock with best found so far
                if (avg_result > best_arm_value) {
                    best_arm_value = avg_result;
                    best_arm_index = i;
                }
            }
        }

        // Select and invest in the best stock found
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

        // Store the investment result - NUR in Compare-Arrays wenn algorithmsCompare aktiv
        if (algorithmStore.algorithmsCompare === true) {
            // Vergleichsmodus: Schreibe in temporäres Array UND in Compare-Arrays
            let compareReward = reward;
            if (algorithmStore.optimalActions === true) {
                compareReward = chosen_arm.stock.id;
            }
            
            // Speichere in tempInvestments für nächste Iteration
            switch (algorithm) {
                case 'greedy':
                    tempInvestments.push({
                        stock: chosen_arm,
                        greedyReturn: reward,
                        eGreedyReturn: null,
                        thompsonReturn: null,
                        ucbReturn: null,
                        gradientReturn: null,
                        optimisticInitialReturn: null,
                        userAlgorithmReturn: null
                    });
                    addGreedyResult('default', compareReward);
                    break;
                case 'eGreedy':
                    tempInvestments.push({
                        stock: chosen_arm,
                        greedyReturn: null,
                        eGreedyReturn: reward,
                        thompsonReturn: null,
                        ucbReturn: null,
                        gradientReturn: null,
                        optimisticInitialReturn: null,
                        userAlgorithmReturn: null
                    });
                    addEGreedyResult(param, compareReward);
                    break;
                case 'OIV':
                    tempInvestments.push({
                        stock: chosen_arm,
                        greedyReturn: null,
                        eGreedyReturn: null,
                        thompsonReturn: null,
                        ucbReturn: null,
                        gradientReturn: null,
                        optimisticInitialReturn: reward,
                        userAlgorithmReturn: null
                    });
                    addOIVResult(param, compareReward);
                    break;
            }
        } else {
            // Normaler Modus: Schreibe NUR in Pinia Store
            switch (algorithm) {
                case 'greedy':
                    algorithmStore.investmentsGreedy.push({
                        stock: chosen_arm,
                        greedyReturn: reward,
                        eGreedyReturn: null,
                        thompsonReturn: null,
                        ucbReturn: null,
                        gradientReturn: null,
                        optimisticInitialReturn: null,
                        userAlgorithmReturn: null
                    });
                    break;
                case 'eGreedy':
                    algorithmStore.investmentsEGreedy.push({
                        stock: chosen_arm,
                        greedyReturn: null,
                        eGreedyReturn: reward,
                        thompsonReturn: null,
                        ucbReturn: null,
                        gradientReturn: null,
                        optimisticInitialReturn: null,
                        userAlgorithmReturn: null
                    });
                    break;
                case 'OIV':
                    algorithmStore.investmentsOptimisticInitial.push({
                        stock: chosen_arm,
                        greedyReturn: null,
                        eGreedyReturn: null,
                        thompsonReturn: null,
                        ucbReturn: null,
                        gradientReturn: null,
                        optimisticInitialReturn: reward,
                        userAlgorithmReturn: null
                    });
                    break;
                default:
                    throw new Error("Unknown algorithm type");
            }
        }
    }
    algorithmStore.algorithmsInProgress = false;
}