import { greedy_bernoulli, greedy_gaussian, eGreedy_bernoulli, eGreedy_gaussian, OIV_bernoulli, OIV_gaussian } from './e_greedy_OIV';
import { thompsonSampling_bernoulli, thompsonSampling_gaussian } from './thompsonSampling';
import { upperConfidenceBound_bernoulli, upperConfidenceBound_gaussian } from './UpperConfidenceBound';
import { gradientBandit_bernoulli, gradientBandit_gaussian } from './gradientBandit';
import { resetCompareResults, calculateAverages, getAllParameterValues } from '@/stores/compare_algos_store';
import { useBanditStore } from '@/stores/bandit';
import { useAlgorithmStore } from '@/stores/algorithms';
import { generateBernoulliParam, generateGaussianParam } from '@/assets/utils/banditHelpers';

interface SelectedAlgo {
    id: string;
    show: { value: boolean };
    label: string;
}

export interface CompareResult {
    algorithmId: string;
    algorithmName: string;
    parameter: number | null;
    datapoints: { iteration: number; optimalPercentage: number }[];
}

export interface ProgressCallback {
    (status: { currentAlgorithm: string; currentParameter: number; totalParameters: number; currentRun: number; totalRuns: number; percentage: number }): void;
}

export async function comp_algos_bernoulli(
    selectedAlgos: SelectedAlgo[],
    runs: number,
    iterations: number,
    params: Record<string, number[]>,
    armCount: number,
    cancelCalculation?: { value: boolean },
    progressCallback?: ProgressCallback
): Promise<CompareResult[]> {
    return await comp_many_runs('bernoulli', selectedAlgos, runs, iterations, params, armCount, cancelCalculation, progressCallback);
}

export async function comp_algos_gaussian(
    selectedAlgos: SelectedAlgo[],
    runs: number,
    iterations: number,
    params: Record<string, number[]>,
    armCount: number,
    cancelCalculation?: { value: boolean },
    progressCallback?: ProgressCallback
): Promise<CompareResult[]> {
    return await comp_many_runs('gaussian', selectedAlgos, runs, iterations, params, armCount, cancelCalculation, progressCallback);
}

async function comp_many_runs(
    bandit: 'bernoulli' | 'gaussian',
    selectedAlgos: SelectedAlgo[],
    runs: number,
    iterations: number,
    params: Record<string, number[]>,
    armCount: number,
    cancelCalculation?: { value: boolean },
    progressCallback?: ProgressCallback
): Promise<CompareResult[]> {
    const algorithmStore = useAlgorithmStore();
    const banditStore = useBanditStore();
    const results: CompareResult[] = [];

    // Reset previous results
    resetCompareResults();
    compareResultsCache = null; // Reset Cache

    // Set up for comparison mode
    banditStore.possibleInvestments = iterations;
    algorithmStore.algorithmsCompare = true;
    algorithmStore.optimalActions = true;

    // 1. Speichere die aktuellen Bandit-Werte
    const originalStocks = banditStore.selectedStocks.map(stock => ({
        ...stock,
        bernoulli_param: stock.bernoulli_param,
        gaussian_param: stock.gaussian_param
    }));

    // Berechne Gesamt-Anzahl der Parameter für Progress
    let totalParameters = 0;
    selectedAlgos.forEach(algo => {
        const algoParams = params[algo.id] || [];
        totalParameters += (algo.id === 'greedy' || algo.id === 'thompson') ? 1 : algoParams.length;
    });

    let completedParameters = 0;

    // Run algorithms for each selected algorithm and parameter combination
    for (const algo of selectedAlgos) {
        if (cancelCalculation?.value) break;
        const algoId = algo.id;
        const algoParams = params[algoId] || [];

        // Handle algorithms without parameters (greedy, thompson)
        if (algoId === 'greedy' || algoId === 'thompson') {
            completedParameters++;
            await runAlgorithmMultipleTimes(bandit, algoId, 'default', runs, iterations, armCount, results, cancelCalculation, completedParameters, totalParameters, progressCallback);
        } else {
            // Run for each parameter value
            for (const paramValue of algoParams) {
                if (cancelCalculation?.value) break;
                completedParameters++;
                await runAlgorithmMultipleTimes(bandit, algoId, paramValue, runs, iterations, armCount, results, cancelCalculation, completedParameters, totalParameters, progressCallback);
            }
        }
    }

    // 2. Stelle die ursprünglichen Werte wieder her
    banditStore.selectedStocks.forEach((stock, index) => {
        if (originalStocks[index]) {
            stock.bernoulli_param = originalStocks[index].bernoulli_param;
            stock.gaussian_param = originalStocks[index].gaussian_param;
        }
    });

    // Reset comparison mode
    algorithmStore.algorithmsCompare = false;
    algorithmStore.optimalActions = false;

    return results;
}

async function runAlgorithmMultipleTimes(
    bandit: 'bernoulli' | 'gaussian',
    algoId: string,
    paramValue: number | string,
    runs: number,
    iterations: number,
    armCount: number,
    results: CompareResult[],
    cancelCalculation?: { value: boolean },
    currentParameter?: number,
    totalParameters?: number,
    progressCallback?: ProgressCallback
): Promise<void> {
    const banditStore = useBanditStore();
    const algorithmStore = useAlgorithmStore();
    
    const algoNames: Record<string, string> = {
        greedy: 'Greedy',
        eGreedy: 'Epsilon-Greedy',
        thompson: 'Thompson Sampling',
        ucb: 'UCB',
        oiv: 'OIV',
        gradient: 'Gradient Bandit'
    };
    
    // Array um für jede Iteration zu tracken, wie oft der optimale Arm gewählt wurde
    const optimalChoicesPerIteration: number[] = new Array(iterations).fill(0);
    
    // Cache selectedStocks für schnelleren Zugriff
    const stocks = banditStore.selectedStocks;
    const stocksToUse = Math.min(armCount, stocks.length);

    // Run the algorithm multiple times
    for (let run = 0; run < runs; run++) {
        if (cancelCalculation?.value) break;
        
        // 1. Generiere neue zufällige Werte für die angegebene Anzahl von Armen
        for (let i = 0; i < stocksToUse; i++) {
            stocks[i].bernoulli_param = generateBernoulliParam();
            stocks[i].gaussian_param = generateGaussianParam();
        }

        // 2. Bestimme den optimalen Arm für diesen Run - optimiert ohne slice/reduce
        let optimalStock = stocks[0];
        if (bandit === 'bernoulli') {
            for (let i = 1; i < stocksToUse; i++) {
                if (stocks[i].bernoulli_param > optimalStock.bernoulli_param) {
                    optimalStock = stocks[i];
                }
            }
        } else {
            for (let i = 1; i < stocksToUse; i++) {
                if (stocks[i].gaussian_param > optimalStock.gaussian_param) {
                    optimalStock = stocks[i];
                }
            }
        }
        const optimalArmId = optimalStock.stock.id;

        // 3. Führe den Algorithmus für diese Iteration durch
        const chosenArms = await runSingleAlgorithm(bandit, algoId, paramValue);
        
        // 4. Prüfe für jede Iteration, ob der optimale Arm gewählt wurde - optimiert
        const len = Math.min(chosenArms.length, iterations);
        for (let i = 0; i < len; i++) {
            if (chosenArms[i] === optimalArmId) {
                optimalChoicesPerIteration[i]++;
            }
        }

        // Progress-Update nur alle 50 Runs (statt 10) für bessere Performance
        if (progressCallback && run % 50 === 0) {
            const percentage = totalParameters ? ((currentParameter! - 1) / totalParameters * 100) + (run / runs / totalParameters * 100) : 0;
            progressCallback({
                currentAlgorithm: algoNames[algoId] || algoId,
                currentParameter: currentParameter || 0,
                totalParameters: totalParameters || 0,
                currentRun: run + 1,
                totalRuns: runs,
                percentage
            });
        }

        // UI-Update nur alle 200 Runs (statt 50) und nur wenn nötig
        if (run % 200 === 0 && run > 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    // 5. Berechne für jede Iteration den Prozentsatz der optimalen Wahl
    const datapoints = new Array(iterations);
    const runsFactor = runs > 0 ? 100 / runs : 0;
    for (let i = 0; i < iterations; i++) {
        datapoints[i] = {
            iteration: i + 1,
            optimalPercentage: optimalChoicesPerIteration[i] * runsFactor
        };
    }

    results.push({
        algorithmId: algoId,
        algorithmName: algoNames[algoId] || algoId,
        parameter: typeof paramValue === 'number' ? paramValue : null,
        datapoints
    });
}

// Cache für compareResults Import (nur einmal importieren)
let compareResultsCache: any = null;

async function runSingleAlgorithm(
    bandit: 'bernoulli' | 'gaussian',
    algoId: string,
    paramValue: number | string
): Promise<number[]> {
    const algorithmStore = useAlgorithmStore();
    
    // Setze den aktuellen Parameter im Store, damit setParamAlgo ihn nutzen kann
    algorithmStore.currentCompareParam = typeof paramValue === 'number' ? paramValue : undefined;
    
    // Import compareResults nur einmal (Cache)
    if (!compareResultsCache) {
        const module = await import('@/stores/compare_algos_store');
        compareResultsCache = module.compareResults;
    }
    
    // Get the map for this algorithm
    const map = compareResultsCache[algoId as keyof typeof compareResultsCache] as Map<any, number[]>;
    
    // WICHTIG: Lösche die Daten für diesen Parameter, damit der Run von vorne startet
    map.delete(paramValue);

    // Run the algorithm
    if (bandit === 'bernoulli') {
        switch (algoId) {
            case 'greedy': greedy_bernoulli(); break;
            case 'eGreedy': eGreedy_bernoulli(); break;
            case 'thompson': thompsonSampling_bernoulli(); break;
            case 'ucb': upperConfidenceBound_bernoulli(); break;
            case 'oiv': OIV_bernoulli(); break;
            case 'gradient': gradientBandit_bernoulli(); break;
        }
    } else {
        switch (algoId) {
            case 'greedy': greedy_gaussian(); break;
            case 'eGreedy': eGreedy_gaussian(); break;
            case 'thompson': thompsonSampling_gaussian(); break;
            case 'ucb': upperConfidenceBound_gaussian(); break;
            case 'oiv': OIV_gaussian(); break;
            case 'gradient': gradientBandit_gaussian(); break;
        }
    }

    // Extract arm IDs from compare results (these are the arm IDs stored by the algorithms)
    const armIds = map.get(paramValue) || [];
    
    // Kopiere die Daten, damit sie nicht von anderen Runs überschrieben werden
    return [...armIds];
}

function formatLabel(algoId: string, paramValue: number | string): string {
    const algoNames: Record<string, string> = {
        greedy: 'Greedy',
        eGreedy: 'ε-Greedy',
        thompson: 'Thompson',
        ucb: 'UCB',
        oiv: 'OIV',
        gradient: 'Gradient'
    };

    const name = algoNames[algoId] || algoId;
    
    if (paramValue === 'default') {
        return name;
    }

    const paramNames: Record<string, string> = {
        eGreedy: 'ε',
        ucb: 'c',
        oiv: 'Q₀',
        gradient: 'α'
    };

    const paramName = paramNames[algoId] || 'p';
    return `${name} (${paramName}=${paramValue})`;
}