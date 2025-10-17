import { greedy_bernoulli, greedy_gaussian, eGreedy_bernoulli, eGreedy_gaussian, OIV_bernoulli, OIV_gaussian } from './e_greedy_OIV';
import { thompsonSampling_bernoulli, thompsonSampling_gaussian } from './thompsonSampling';
import { upperConfidenceBound_bernoulli, upperConfidenceBound_gaussian } from './UpperConfidenceBound';
import { gradientBandit_bernoulli, gradientBandit_gaussian } from './gradientBandit';

import { useBanditStore } from '@/stores/bandit';
import { useAlgorithmStore } from '@/stores/algorithms';

const runs = 200;

// Module-level variable to store initial state
let savedAlgorithmState: any = null;
let savedPossibleInvestments: number = 0;

function save_current_state() {
    const algorithmStore = useAlgorithmStore();
    const banditStore = useBanditStore();
    savedAlgorithmState = JSON.parse(JSON.stringify(algorithmStore.$state));
    savedPossibleInvestments = banditStore.possibleInvestments;
    algorithmStore.resetAlgorithms();
}

export function restore_saved_state() {
    const banditStore = useBanditStore();
    const algorithmStore = useAlgorithmStore();
    try {
        if (savedAlgorithmState) {
            algorithmStore.$state = JSON.parse(JSON.stringify(savedAlgorithmState));
            banditStore.possibleInvestments = savedPossibleInvestments;
        }
        else {
            console.warn("No saved algorithm state to reset to.");
        }
        algorithmStore.algorithmsCompare = false;
    } catch (error) {
        console.error("Error resetting algorithm store:", error);
    }
}

export function comp_algos_bernoulli() {
    const bandit = 'bernoulli';
    comp_many_runs(bandit);
}

export function comp_algos_gaussian() {
    const bandit = 'gaussian';
    comp_many_runs(bandit);
}

function comp_many_runs(bandit: 'bernoulli' | 'gaussian') {
    const algorithmStore = useAlgorithmStore();
    const banditStore = useBanditStore();

    // Set investments and comparisons
    banditStore.possibleInvestments = runs;
    algorithmStore.algorithmsCompare = true;

    switch (bandit) {
        case 'bernoulli':
            greedy_bernoulli();
            eGreedy_bernoulli();
            thompsonSampling_bernoulli();
            upperConfidenceBound_bernoulli();
            OIV_bernoulli();
            gradientBandit_bernoulli();
            break;
        case 'gaussian':
            greedy_gaussian();
            eGreedy_gaussian();
            thompsonSampling_gaussian();
            upperConfidenceBound_gaussian();
            OIV_gaussian();
            gradientBandit_gaussian();
            break;
    }
}