import { useAlgorithmStore } from '@/stores/algorithms';
import { reactive } from 'vue';

// Parameter als einfache Arrays
const algorithmParam = reactive<Record<string, number[]>>({
    eGreedy: [0.1],      // ε=0.1 ist default
    ucb: [2],            // c=2 ist default
    oiv: [5],            // initial=5 ist default
    gradient: [0.1],     // α=0.1 ist default
});

export function addAlgorithmParam(algorithm: string, value: number, idx: number): void {
    if (!algorithmParam[algorithm]) {
        algorithmParam[algorithm] = [];
    }
    
    // Wenn Index existiert: Wert am Index setzen
    // Wenn Index neu: Wert hinzufügen (aber nur wenn nicht schon vorhanden)
    if (idx < algorithmParam[algorithm].length) {
        algorithmParam[algorithm][idx] = value;
    } else if (!algorithmParam[algorithm].includes(value)) {
        algorithmParam[algorithm].push(value);
    }
}

export function removeAlgorithmParam(algorithm: string, idx: number): void {
    if (algorithmParam[algorithm]) {
        algorithmParam[algorithm].splice(idx, 1);
    }
}

export function getAlgorithmParams(): Record<string, number[]> {
    return { ...algorithmParam };
}

function getDefaultParams() {
    return {
        eGreedy: 0.1,
        ucb: 2,
        oiv: 5,
        gradient: 0.1,
    };
}

export function setParamAlgo(algorithm: 'eGreedy' | 'ucb' | 'OIV' | 'gradient') {
    const algorithmStore = useAlgorithmStore();
    
    // Im Compare-Modus: Nutze currentCompareParam aus dem Store
    if (algorithmStore.algorithmsCompare === true && algorithmStore.currentCompareParam !== undefined) {
        return algorithmStore.currentCompareParam;
    }
    
    // Im Normal-Modus: Nutze Default-Werte
    if (algorithmStore.algorithmsCompare === false) {
        switch (algorithm) {
            case "eGreedy":
                return getDefaultParams().eGreedy;
            case "ucb":
                return getDefaultParams().ucb;
            case "OIV":
                return getDefaultParams().oiv;
            case "gradient":
                return getDefaultParams().gradient;
        }
    }
    
    // Fallback
    return getDefaultParams().ucb;
}