// Globale Maps für alle Algorithmen - vollständig dynamisch
export const compareResults = {
    greedy: new Map<string, number[]>(),    // parameter-key -> rewards
    eGreedy: new Map<number, number[]>(),   // epsilon -> rewards
    thompson: new Map<string, number[]>(),  // parameter-key -> rewards
    ucb: new Map<number, number[]>(),       // c -> rewards
    oiv: new Map<number, number[]>(),       // initial_value -> rewards
    gradient: new Map<number, number[]>(),  // alpha -> rewards
};

// Generische Hilfsfunktion zum Hinzufügen
export function addResult(
    algorithm: 'greedy' | 'eGreedy' | 'thompson' | 'ucb' | 'oiv' | 'gradient',
    parameter: number | string,
    reward: number
) {
    const map = compareResults[algorithm] as Map<any, number[]>;
    
    if (!map.has(parameter)) {
        map.set(parameter, []);
    }
    map.get(parameter)!.push(reward);
}

// Spezifische Hilfsfunktionen
export function addGreedyResult(parameterKey: string, reward: number) {
    addResult('greedy', parameterKey, reward);
}

export function addEGreedyResult(epsilon: number, reward: number) {
    addResult('eGreedy', epsilon, reward);
}

export function addThompsonResult(parameterKey: string, reward: number) {
    addResult('thompson', parameterKey, reward);
}

export function addUCBResult(c: number, reward: number) {
    addResult('ucb', c, reward);
}

export function addOIVResult(initialValue: number, reward: number) {
    addResult('oiv', initialValue, reward);
}

export function addGradientResult(alpha: number, reward: number) {
    addResult('gradient', alpha, reward);
}

// Hilfsfunktion zum Zurücksetzen
export function resetCompareResults() {
    compareResults.greedy.clear();
    compareResults.eGreedy.clear();
    compareResults.thompson.clear();
    compareResults.ucb.clear();
    compareResults.oiv.clear();
    compareResults.gradient.clear();
}

// Hilfsfunktion zum Berechnen von Durchschnitten
export function calculateAverages() {
    return {
        greedy: mapToAverages(compareResults.greedy),
        eGreedy: mapToAverages(compareResults.eGreedy),
        thompson: mapToAverages(compareResults.thompson),
        ucb: mapToAverages(compareResults.ucb),
        oiv: mapToAverages(compareResults.oiv),
        gradient: mapToAverages(compareResults.gradient),
    };
}

function mapToAverages(map: Map<any, number[]>): Record<string, number> {
    const result: Record<string, number> = {};
    map.forEach((rewards, param) => {
        result[String(param)] = average(rewards);
    });
    return result;
}

function average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

// Optional: Hilfsfunktion zum Berechnen der Gesamtsummen
export function getTotalRewards() {
    return {
        greedy: mapToTotals(compareResults.greedy),
        eGreedy: mapToTotals(compareResults.eGreedy),
        thompson: mapToTotals(compareResults.thompson),
        ucb: mapToTotals(compareResults.ucb),
        oiv: mapToTotals(compareResults.oiv),
        gradient: mapToTotals(compareResults.gradient),
    };
}

function mapToTotals(map: Map<any, number[]>): Record<string, number> {
    const result: Record<string, number> = {};
    map.forEach((rewards, param) => {
        result[String(param)] = sum(rewards);
    });
    return result;
}

function sum(arr: number[]): number {
    return arr.reduce((sum, val) => sum + val, 0);
}

// Hilfsfunktion um alle Parameter-Werte zu bekommen (für UI)
export function getAllParameterValues() {
    return {
        greedyKeys: Array.from(compareResults.greedy.keys()).sort(),
        epsilonValues: Array.from(compareResults.eGreedy.keys()).sort((a, b) => a - b),
        thompsonKeys: Array.from(compareResults.thompson.keys()).sort(),
        ucbValues: Array.from(compareResults.ucb.keys()).sort((a, b) => a - b),
        oivValues: Array.from(compareResults.oiv.keys()).sort((a, b) => a - b),
        alphaValues: Array.from(compareResults.gradient.keys()).sort((a, b) => a - b),
    };
}

// Hilfsfunktion um alle Daten eines Algorithmus zu bekommen
export function getAlgorithmData(algorithm: keyof typeof compareResults) {
    const map = compareResults[algorithm];
    const data: Array<{ parameter: any; rewards: number[]; average: number; total: number }> = [];
    
    map.forEach((rewards, param) => {
        data.push({
            parameter: param,
            rewards: [...rewards],
            average: average(rewards),
            total: sum(rewards),
        });
    });
    
    return data;
}

// Hilfsfunktion für Console-Logging
export function logCompareResults() {
    console.log('=== Compare Results ===');
    
    (['greedy', 'eGreedy', 'thompson', 'ucb', 'oiv', 'gradient'] as const).forEach(algo => {
        const data = getAlgorithmData(algo);
        if (data.length > 0) {
            console.log(`\n${algo.toUpperCase()}:`);
            data.forEach(({ parameter, average, total, rewards }) => {
                console.log(`  ${parameter}: avg=${average.toFixed(2)}, total=${total.toFixed(2)}, runs=${rewards.length}`);
            });
        }
    });
}