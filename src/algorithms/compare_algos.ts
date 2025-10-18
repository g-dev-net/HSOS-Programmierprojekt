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
    const optimalChoicesPerIteration: number[] = Array.from({ length: iterations }, () => 0);

    // Run the algorithm multiple times
    for (let run = 0; run < runs; run++) {
        if (cancelCalculation?.value) break;
        
        // 1. Generiere neue zufällige Werte für die angegebene Anzahl von Armen
        // Nutze nur die ersten armCount Arme
        for (let i = 0; i < Math.min(armCount, banditStore.selectedStocks.length); i++) {
            banditStore.selectedStocks[i].bernoulli_param = generateBernoulliParam();
            banditStore.selectedStocks[i].gaussian_param = generateGaussianParam();
        }

        // 2. Bestimme den optimalen Arm für diesen Run (nur die ersten armCount Arme)
        const stocks = banditStore.selectedStocks.slice(0, armCount);
        const optimalArmId = bandit === 'bernoulli'
            ? stocks.reduce((best, stock) => stock.bernoulli_param > best.bernoulli_param ? stock : best, stocks[0]).stock.id
            : stocks.reduce((best, stock) => stock.gaussian_param > best.gaussian_param ? stock : best, stocks[0]).stock.id;

        // 3. Führe den Algorithmus für diese Iteration durch
        const chosenArms = await runSingleAlgorithm(bandit, algoId, paramValue);
        
        // 4. Prüfe für jede Iteration, ob der optimale Arm gewählt wurde
        chosenArms.forEach((armId, iteration) => {
            if (iteration < iterations && armId === optimalArmId) {
                optimalChoicesPerIteration[iteration]++;
            }
        });

        // Progress-Update alle 10 Runs (statt 5 für bessere Performance)
        if (progressCallback && run % 10 === 0) {
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

        // Allow UI to update every 50 runs for better performance
        if (run % 50 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    // 5. Berechne für jede Iteration den Prozentsatz der optimalen Wahl
    const datapoints = optimalChoicesPerIteration.map((count, index) => {
        const optimalPercentage = runs > 0 ? (count / runs) * 100 : 0;
        return { iteration: index + 1, optimalPercentage };
    });

    results.push({
        algorithmId: algoId,
        algorithmName: algoNames[algoId] || algoId,
        parameter: typeof paramValue === 'number' ? paramValue : null,
        datapoints
    });
}

async function runSingleAlgorithm(
    bandit: 'bernoulli' | 'gaussian',
    algoId: string,
    paramValue: number | string
): Promise<number[]> {
    const algorithmStore = useAlgorithmStore();
    
    // Setze den aktuellen Parameter im Store, damit setParamAlgo ihn nutzen kann
    algorithmStore.currentCompareParam = typeof paramValue === 'number' ? paramValue : undefined;
    
    // Import compareResults to access the stored arm IDs
    const { compareResults } = await import('@/stores/compare_algos_store');
    
    // Get the map for this algorithm
    const map = compareResults[algoId as keyof typeof compareResults] as Map<any, number[]>;
    
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