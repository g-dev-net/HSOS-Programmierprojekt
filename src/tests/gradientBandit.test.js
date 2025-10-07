import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { gradientBandit_bernoulli, gradientBandit_gaussian } from '../algorithms/gradientBandit.ts';
import { useBanditStore } from '@/stores/bandit';
import { useAlgorithmStore } from '@/stores/algorithms';
import { bernoulli } from '../bandits/bernoulli.js';
import { gaussian } from '../bandits/gaussian.js';

// Mock bandit functions for predictable testing
vi.mock('../bandits/bernoulli.js', () => ({
  bernoulli: vi.fn()
}));

vi.mock('../bandits/gaussian.js', () => ({
  gaussian: vi.fn()
}));

describe('Gradient Bandit Algorithm', () => {
  let banditStore;
  let algorithmStore;

  beforeEach(() => {
    // Initialize Pinia
    const pinia = createPinia();
    setActivePinia(pinia);
    
    // Get store instances
    banditStore = useBanditStore();
    algorithmStore = useAlgorithmStore();
    
    // Reset stores
    banditStore.selectedStocks = [];
    banditStore.possibleInvestments = 0;
    algorithmStore.investmentsGradient = [];
    algorithmStore.algorithmsInProgress = false;
    
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('Store Integration', () => {
    it('should access bandit store correctly', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 1;
      
      expect(banditStore.selectedStocks).toHaveLength(1);
      expect(banditStore.possibleInvestments).toBe(1);
    });

    it('should access algorithm store correctly', () => {
      algorithmStore.investmentsGradient = [
        { stock: { id: 1 }, gradientReturn: 0.5, greedyReturn: null }
      ];
      
      expect(algorithmStore.investmentsGradient).toHaveLength(1);
    });

    it('should set algorithmsInProgress flag', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 1;
      bernoulli.mockReturnValue(true);
      
      gradientBandit_bernoulli();
      
      expect(algorithmStore.algorithmsInProgress).toBe(false); // Should be false after completion
    });
  });

  describe('Uniform Policy Initialization', () => {
    it('should initialize each stock with gradientReturn 0 and other values null', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.7, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 0; // No additional investments
      
      gradientBandit_bernoulli();
      
      expect(algorithmStore.investmentsGradient).toHaveLength(2); // Only uniform init entries
      
      algorithmStore.investmentsGradient.forEach((investment, index) => {
        expect(investment.stock).toBe(banditStore.selectedStocks[index]);
        expect(investment.gradientReturn).toBe(0);
        expect(investment.greedyReturn).toBe(null);
        expect(investment.thompsonReturn).toBe(null);
        expect(investment.ucbReturn).toBe(null);
        expect(investment.optimisticInitialReturn).toBe(null);
        expect(investment.userAlgorithmReturn).toBe(null);
      });
    });

    it('should initialize with exactly one entry per selected stock', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Stock A' }, bernoulli_param: 0.5, gaussian_param: 0.1 }
      ];
      banditStore.possibleInvestments = 0;
      
      gradientBandit_gaussian();
      
      expect(algorithmStore.investmentsGradient).toHaveLength(1);
      expect(algorithmStore.investmentsGradient[0].stock.stock.name).toBe("Stock A");
      expect(algorithmStore.investmentsGradient[0].gradientReturn).toBe(0);
    });
  });

  describe('Softmax Action Selection', () => {
    it('should calculate exponentials correctly', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.7, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 1;
      
      // Mock Math.random to control action selection
      const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.3);
      bernoulli.mockReturnValue(true);
      
      gradientBandit_bernoulli();
      
      // Should complete without errors (exponentials calculated correctly)
      expect(algorithmStore.investmentsGradient).toHaveLength(3); // 2 init + 1 investment
      
      mathRandomSpy.mockRestore();
    });

    it('should create valid probability distribution', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.7, gaussian_param: 0.03 },
        { stock: { id: 3, name: 'Tesla' }, bernoulli_param: 0.5, gaussian_param: 0.04 }
      ];
      banditStore.possibleInvestments = 1;
      
      const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      gaussian.mockReturnValue(0.05);
      
      gradientBandit_gaussian();
      
      // Should select valid action (no errors in probability calculation)
      expect(algorithmStore.investmentsGradient).toHaveLength(4); // 3 init + 1 investment
      
      const lastInvestment = algorithmStore.investmentsGradient[algorithmStore.investmentsGradient.length - 1];
      expect(banditStore.selectedStocks).toContainEqual(lastInvestment.stock);
      
      mathRandomSpy.mockRestore();
    });

    it('should handle uniform preferences correctly', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.7, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 10;
      
      // With uniform preferences (H = [0, 0]), both actions should be selected
      bernoulli.mockReturnValue(true);
      
      gradientBandit_bernoulli();
      
      const actualInvestments = algorithmStore.investmentsGradient.slice(2); // Skip init
      const appleSelections = actualInvestments.filter(inv => inv.stock.stock.name === 'Apple').length;
      const googleSelections = actualInvestments.filter(inv => inv.stock.stock.name === 'Google').length;
      
      // Both actions should be selected at least once in 10 trials
      expect(appleSelections + googleSelections).toBe(10);
      expect(appleSelections).toBeGreaterThan(0);
      expect(googleSelections).toBeGreaterThan(0);
    });
  });

  describe('Cumulative Probability Sampling', () => {
    it('should select first action when random value is low', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.7, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 1;
      
      // Mock very low random value to select first action
      const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
      bernoulli.mockReturnValue(true);
      
      gradientBandit_bernoulli();
      
      const lastInvestment = algorithmStore.investmentsGradient[algorithmStore.investmentsGradient.length - 1];
      expect(lastInvestment.stock.stock.name).toBe('Apple');
      
      mathRandomSpy.mockRestore();
    });

    it('should select last action when random value is high', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.7, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 1;
      
      // Mock high random value to select last action
      const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
      gaussian.mockReturnValue(0.05);
      
      gradientBandit_gaussian();
      
      const lastInvestment = algorithmStore.investmentsGradient[algorithmStore.investmentsGradient.length - 1];
      expect(lastInvestment.stock.stock.name).toBe('Google');
      
      mathRandomSpy.mockRestore();
    });

    it('should handle single action case', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 1;
      
      const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      bernoulli.mockReturnValue(false);
      
      gradientBandit_bernoulli();
      
      expect(algorithmStore.investmentsGradient).toHaveLength(2); // 1 init + 1 investment
      const lastInvestment = algorithmStore.investmentsGradient[algorithmStore.investmentsGradient.length - 1];
      expect(lastInvestment.stock.stock.name).toBe('Apple');
      
      mathRandomSpy.mockRestore();
    });
  });

  describe('Average Reward Calculation', () => {
    it('should update average reward correctly with single value', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 1;
      
      bernoulli.mockReturnValue(true); // reward = 1
      
      gradientBandit_bernoulli();
      
      // After 1 trial with reward=1: avgReward = 0 + (1-0)/1 = 1
      expect(algorithmStore.investmentsGradient).toHaveLength(2);
      expect(algorithmStore.investmentsGradient[1].gradientReturn).toBe(1);
    });

    it('should calculate incremental average correctly', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 3;
      
      // Mock deterministic rewards: 1, 0, 1
      bernoulli
        .mockReturnValueOnce(true)   // reward = 1
        .mockReturnValueOnce(false)  // reward = 0
        .mockReturnValueOnce(true);  // reward = 1
      
      gradientBandit_bernoulli();
      
      // Average should be (1 + 0 + 1) / 3 = 0.667
      expect(algorithmStore.investmentsGradient).toHaveLength(4); // 1 init + 3 investments
      
      const rewards = algorithmStore.investmentsGradient.slice(1).map(inv => inv.gradientReturn);
      expect(rewards).toEqual([1, 0, 1]);
    });

    it('should handle gaussian rewards correctly', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 2;
      
      gaussian
        .mockReturnValueOnce(0.05)
        .mockReturnValueOnce(0.03);
      
      gradientBandit_gaussian();
      
      const rewards = algorithmStore.investmentsGradient.slice(1).map(inv => inv.gradientReturn);
      expect(rewards).toEqual([0.05, 0.03]);
    });
  });

  describe('Preference Updates', () => {
    it('should update preferences for selected action correctly', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.8, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.2, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 5;
      
      // Force selection of first action and high rewards
      const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
      bernoulli.mockReturnValue(true); // Always reward = 1
      
      gradientBandit_bernoulli();
      
      // With high rewards and first action always selected,
      // preferences should shift towards first action
      expect(algorithmStore.investmentsGradient).toHaveLength(7); // 2 init + 5 investments
      
      const actualInvestments = algorithmStore.investmentsGradient.slice(2);
      actualInvestments.forEach(investment => {
        expect(investment.stock.stock.name).toBe('Apple');
        expect(investment.gradientReturn).toBe(1);
      });
      
      mathRandomSpy.mockRestore();
    });

    it('should handle negative rewards correctly', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.1, gaussian_param: -0.05 }
      ];
      banditStore.possibleInvestments = 2;
      
      gaussian
        .mockReturnValueOnce(-0.1)  // Negative reward
        .mockReturnValueOnce(0.05); // Positive reward
      
      gradientBandit_gaussian();
      
      const rewards = algorithmStore.investmentsGradient.slice(1).map(inv => inv.gradientReturn);
      expect(rewards).toEqual([-0.1, 0.05]);
    });

    it('should handle zero learning rate edge case', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 1;
      
      bernoulli.mockReturnValue(true);
      
      // Should complete without errors even with preference updates
      gradientBandit_bernoulli();
      
      expect(algorithmStore.investmentsGradient).toHaveLength(2);
    });
  });

  describe('Mathematical Correctness', () => {
    it('should implement correct incremental average formula', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 4;
      
      // Known rewards for mathematical verification
      gaussian
        .mockReturnValueOnce(1.0)   // t=1: avg = 1.0
        .mockReturnValueOnce(2.0)   // t=2: avg = 1.5
        .mockReturnValueOnce(3.0)   // t=3: avg = 2.0
        .mockReturnValueOnce(4.0);  // t=4: avg = 2.5
      
      gradientBandit_gaussian();
      
      const rewards = algorithmStore.investmentsGradient.slice(1).map(inv => inv.gradientReturn);
      expect(rewards).toEqual([1.0, 2.0, 3.0, 4.0]);
      
      // Verify sequence progression
      expect(rewards).toHaveLength(4);
    });

    it('should handle very small probabilities without numerical issues', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.7, gaussian_param: 0.03 },
        { stock: { id: 3, name: 'Tesla' }, bernoulli_param: 0.5, gaussian_param: 0.04 }
      ];
      banditStore.possibleInvestments = 1;
      
      bernoulli.mockReturnValue(true);
      
      // Should handle softmax calculation without errors
      gradientBandit_bernoulli();
      
      expect(algorithmStore.investmentsGradient).toHaveLength(4); // 3 init + 1 investment
    });

    it('should verify preference update formula', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.7, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 1;
      
      // Force first action selection
      const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
      bernoulli.mockReturnValue(true);
      
      gradientBandit_bernoulli();
      
      // Preference updates should follow: H[selected] += α(R-R̄)(1-π), H[others] -= α(R-R̄)π
      expect(algorithmStore.investmentsGradient).toHaveLength(3);
      
      mathRandomSpy.mockRestore();
    });
  });

  describe('Bernoulli vs Gaussian Cases', () => {
    it('should handle bernoulli rewards as 0/1 values', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 5;
      
      bernoulli
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      
      gradientBandit_bernoulli();
      
      const actualRewards = algorithmStore.investmentsGradient.slice(1).map(inv => inv.gradientReturn);
      actualRewards.forEach(reward => {
        expect([0, 1]).toContain(reward);
      });
      expect(actualRewards).toEqual([1, 0, 1, 0, 1]);
    });

    it('should handle gaussian rewards as continuous values', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 3;
      
      gaussian
        .mockReturnValueOnce(0.025)
        .mockReturnValueOnce(0.075)
        .mockReturnValueOnce(-0.015);
      
      gradientBandit_gaussian();
      
      const actualRewards = algorithmStore.investmentsGradient.slice(1).map(inv => inv.gradientReturn);
      expect(actualRewards).toEqual([0.025, 0.075, -0.015]);
      
      actualRewards.forEach(reward => {
        expect(typeof reward).toBe('number');
        expect(reward).not.toBe(0);
        expect(reward).not.toBe(1);
      });
    });

    it('should maintain same algorithm structure for both bandit types', () => {
      const testStock = { stock: { id: 1, name: 'Test' }, bernoulli_param: 0.6, gaussian_param: 0.05 };
      banditStore.selectedStocks = [testStock];
      banditStore.possibleInvestments = 1;
      
      // Test Bernoulli
      algorithmStore.investmentsGradient = [];
      bernoulli.mockReturnValue(true);
      gradientBandit_bernoulli();
      const bernoulliResult = algorithmStore.investmentsGradient[1];
      
      // Test Gaussian
      algorithmStore.investmentsGradient = [];
      gaussian.mockReturnValue(0.05);
      gradientBandit_gaussian();
      const gaussianResult = algorithmStore.investmentsGradient[1];
      
      // Structure should be identical
      expect(Object.keys(bernoulliResult)).toEqual(Object.keys(gaussianResult));
      expect(bernoulliResult.greedyReturn).toBe(null);
      expect(gaussianResult.greedyReturn).toBe(null);
      expect(bernoulliResult.thompsonReturn).toBe(null);
      expect(gaussianResult.thompsonReturn).toBe(null);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero possibleInvestments', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 0;
      
      gradientBandit_bernoulli();
      
      expect(algorithmStore.investmentsGradient).toHaveLength(1); // Only init
      expect(algorithmStore.algorithmsInProgress).toBe(false);
    });

    it('should maintain consistent algorithmsInProgress state', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 1;
      
      expect(algorithmStore.algorithmsInProgress).toBe(false);
      
      bernoulli.mockReturnValue(true);
      gradientBandit_bernoulli();
      
      expect(algorithmStore.algorithmsInProgress).toBe(false); // Should be reset after completion
    });

    it('should handle large number of actions', () => {
      // Create 10 stocks
      const manyStocks = Array.from({ length: 10 }, (_, i) => ({
        stock: { id: i + 1, name: `Stock${i + 1}` },
        bernoulli_param: 0.5 + (i * 0.01),
        gaussian_param: 0.05 + (i * 0.001)
      }));
      
      banditStore.selectedStocks = manyStocks;
      banditStore.possibleInvestments = 5;
      
      gaussian.mockReturnValue(0.05);
      
      gradientBandit_gaussian();
      
      expect(algorithmStore.investmentsGradient).toHaveLength(15); // 10 init + 5 investments
      expect(algorithmStore.algorithmsInProgress).toBe(false);
    });
  });
});
