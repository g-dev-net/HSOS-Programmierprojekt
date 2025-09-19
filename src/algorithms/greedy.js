// "Cold Start" Greedy Algorithm for Bernoulli and Gaussian Bandits
import { bernoulli } from '../bandits/bernoulli.js';
import { gaussian } from '../bandits/gaussian.js';

const val_epsilon = 0.1;

function greedy_bernoulli(arms, trials) {
    const bandit = 'bernoulli';
    const epsilon = false;
    return xGreedy(arms, trials, bandit, epsilon);
}

function eGreedy_bernoulli(arms, trials) {
    const bandit = 'bernoulli';
    const epsilon = true;
    return xGreedy(arms, trials, bandit, epsilon);
}

function greedy_gaussian(arms,trials) {
    const bandit = 'gaussian';
    const epsilon = false;
    return xGreedy(arms, trials, bandit, epsilon);
}

function eGreedy_gaussian(arms, trials) {
    const bandit = 'gaussian';
    const epsilon = true;
    return xGreedy(arms, trials, bandit, epsilon);
}

function xGreedy(arms, trials, bandit, epsilon) {
    const greedy = init_array_arms(arms);

    // Try the arm with best success rate until anotherone is better (greedy)
    // OR try greedy but with probability e a random arm (e-greedy)
    let best_arm_index = 0;
    let best_arm_value = 0;
    for (let t = 0; t < trials; t++) {
        if (epsilon && Math.random() < val_epsilon) {
            best_arm_index = Math.floor(Math.random() * greedy.length);
        }
        else {
            for (let i = 0; i < greedy.length; i++) {
                const current_value = greedy[i].bandit_result;
                if (current_value > best_arm_value) {
                    best_arm_value = current_value;
                    best_arm_index = i;
                }
            }
        }

        const chosen_arm = greedy[best_arm_index];
        switch (bandit) {
            case 'bernoulli':
                chosen_arm.trial_result.push(bernoulli(arms[best_arm_index].propability));
                chosen_arm.bandit_result = chosen_arm.trial_result.reduce((sum, result) => sum + (result ? 1 : 0), 0) / chosen_arm.trial_result.length;
                break;
            case 'gaussian':
                chosen_arm.trial_result.push(gaussian(arms[best_arm_index].mean, arms[best_arm_index].variance));
                chosen_arm.bandit_result = chosen_arm.trial_result.reduce((sum, result) => sum + result, 0) / chosen_arm.trial_result.length;
                break;
        }
    }
    
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

export { greedy_bernoulli, eGreedy_bernoulli, greedy_gaussian, eGreedy_gaussian, init_array_arms }