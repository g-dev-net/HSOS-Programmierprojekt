// "Cold Start" Greedy Algorithm for Bernoulli and Gaussian Bandits
import { bernoulli } from '../bandits/bernoulli.js';
import { gaussian } from '../bandits/gaussian.js';
import { useBanditStore } from '@/stores/bandit';
import { useAlgorithmStore } from '@/stores/algorithms';
import { addGreedyResult, addEGreedyResult, addOIVResult } from '@/stores/compare_algos_store';
import { setParamAlgo } from '@/stores/parameter_algos.ts';

export function greedy_bernoulli() {
    const bandit = 'bernoulli';
    xGreedy(bandit, 'greedy');
}

export function eGreedy_bernoulli() {
    const bandit = 'bernoulli';
    xGreedy(bandit, 'eGreedy');
}

export function OIV_bernoulli() {
    const bandit = 'bernoulli';
    xGreedy(bandit, 'OIV');
}

export function greedy_gaussian() {
    const bandit = 'gaussian';
    xGreedy(bandit, 'greedy');
}

export function eGreedy_gaussian() {
    const bandit = 'gaussian';
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

    // Im Compare-Modus: Nutze lokales temporäres Array statt Pinia Store
    const isCompareMode = algorithmStore.algorithmsCompare;
    const tempInvestments: any[] = [];
    
    // PERFORMANCE-OPTIMIERUNG: Cache für Summen und Counts pro Stock
    // Verhindert teure filter().reduce() Operationen in jeder Iteration
    const stockCache = new Map<any, { sum: number; count: number }>();
    
    // Initialisiere Cache für alle Stocks
    for (let i = 0; i < stock.length; i++) {
        stockCache.set(stock[i], { sum: 0, count: 0 });
    }

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
                // Nutze Cache für schnellen Zugriff
                const cached = stockCache.get(stock[i])!;
                
                if (algorithm === 'OIV' && cached.count === 0) {
                    avg_result = param; // Optimistic initial value
                } else if (cached.count > 0) {
                    avg_result = cached.sum / cached.count;
                } else {
                    avg_result = 0;
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
            
            // UPDATE CACHE: Inkrementiere Summe und Count für diesen Stock
            const cached = stockCache.get(chosen_arm)!;
            cached.sum += reward;
            cached.count++;
            
            // Speichere in tempInvestments für Backup (falls nötig)
            tempInvestments.push({
                stock: chosen_arm,
                greedyReturn: algorithm === 'greedy' ? reward : null,
                eGreedyReturn: algorithm === 'eGreedy' ? reward : null,
                thompsonReturn: null,
                ucbReturn: null,
                gradientReturn: null,
                optimisticInitialReturn: algorithm === 'OIV' ? reward : null,
                userAlgorithmReturn: null
            });
            
            // Schreibe in Compare-Arrays
            switch (algorithm) {
                case 'greedy':
                    addGreedyResult('default', compareReward);
                    break;
                case 'eGreedy':
                    addEGreedyResult(param, compareReward);
                    break;
                case 'OIV':
                    addOIVResult(param, compareReward);
                    break;
            }
        } else {
            // Normaler Modus: Schreibe NUR in Pinia Store
            // UPDATE CACHE auch im normalen Modus!
            const cached = stockCache.get(chosen_arm)!;
            cached.sum += reward;
            cached.count++;
            
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