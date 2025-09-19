// "Cold Start" Greedy Algorithm for Bernoulli and Gaussian Bandits
import { bernoulli } from '../bandits/bernoulli.js';
import { gaussian } from '../bandits/gaussian.js';

function greedy_bernoulli(arms, trials) {
    const greedy = init_array_arms(arms);
    
    // Try the arm with best success rate until anotherone is better
    for (let t = 0; t < trials; t++) {
        let best_arm_index = 0;
        let best_arm_value = -1;

        for (let i = 0; i < greedy.length; i++) {
            const current_value = greedy[i].bandit_result;
            if (current_value > best_arm_value) {
                best_arm_value = current_value;
                best_arm_index = i;
            }
        }

        const chosen_arm = greedy[best_arm_index];
        chosen_arm.trial_result.push(bernoulli(arms[best_arm_index].propability));
        chosen_arm.bandit_result = chosen_arm.trial_result.reduce((sum, result) => sum + (result ? 1 : 0), 0) / chosen_arm.trial_result.length;
    }

    return greedy;
}

function greedy_gaussian(arms) {
    const greedy = init_array_arms(arms);

    return greedy;
}

function init_array_arms(arms) {
    const greedy = [];

    arms.forEach(arm => {
        greedy.push({
            name: arm.name,
            trial_result: [],
            bandit_result: 0
        });
    });

    return greedy;
}

export { greedy_bernoulli, greedy_gaussian, init_array_arms }

// Array arms
// const arms = [
//     {name: "Arm1", propability: 0.6},
//     {name: "Arm2", propability: 0.2},
//     {name: "Arm3", propability: 1.0}
// ]