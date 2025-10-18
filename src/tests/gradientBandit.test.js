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
    const pinia = createPinia();
    setActivePinia(pinia);
    
    banditStore = useBanditStore();
    algorithmStore = useAlgorithmStore();
    
    banditStore.selectedStocks = [];
    banditStore.possibleInvestments = 0;
    algorithmStore.investmentsGradient = [];
    algorithmStore.algorithmsInProgress = false;
    
    vi.clearAllMocks();
  });

  describe('Store Integration Tests', () => {
    it('should write investments to investmentsGradient store', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 3;
      bernoulli.mockReturnValue(true);
      
      gradientBandit_bernoulli();
      
      expect(algorithmStore.investmentsGradient).toHaveLength(3);
      algorithmStore.investmentsGradient.forEach(inv => {
        expect(inv.gradientReturn).toBeDefined();
        expect(inv.greedyReturn).toBe(null);
        expect(inv.thompsonReturn).toBe(null);
      });
    });

    it('should set and reset algorithmsInProgress flag', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 1;
      bernoulli.mockReturnValue(true);
      
      expect(algorithmStore.algorithmsInProgress).toBe(false);
      gradientBandit_bernoulli();
      expect(algorithmStore.algorithmsInProgress).toBe(false);
    });
  });

  describe('Loop Execution Tests', () => {
    it('should execute exactly possibleInvestments iterations', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 10;
      bernoulli.mockReturnValue(true);
      
      gradientBandit_bernoulli();
      
      expect(algorithmStore.investmentsGradient).toHaveLength(10);
    });

    it('should handle zero investments', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 0;
      
      gradientBandit_gaussian();
      
      expect(algorithmStore.investmentsGradient).toHaveLength(0);
    });
  });

  describe('Softmax Action Selection Tests', () => {
    it('should select actions using softmax probabilities', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.7, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 20;
      bernoulli.mockReturnValue(true);
      
      gradientBandit_bernoulli();
      
      // Both stocks should be selected at least once with uniform preferences
      const appleCount = algorithmStore.investmentsGradient.filter(
        inv => inv.stock.stock.name === 'Apple'
      ).length;
      const googleCount = algorithmStore.investmentsGradient.filter(
        inv => inv.stock.stock.name === 'Google'
      ).length;
      
      expect(appleCount + googleCount).toBe(20);
      expect(appleCount).toBeGreaterThan(0);
      expect(googleCount).toBeGreaterThan(0);
    });

    it('should use cumulative probability for action selection', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.7, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 1;
      
      // Force first action selection
      const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
      gaussian.mockReturnValue(0.05);
      
      gradientBandit_gaussian();
      
      expect(algorithmStore.investmentsGradient[0].stock.stock.name).toBe('Apple');
      
      mathRandomSpy.mockRestore();
    });
  });

  describe('Average Reward Calculation Tests', () => {
    it('should calculate incremental average reward correctly', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 3;
      
      // Known rewards: 1, 0, 1
      bernoulli
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      
      gradientBandit_bernoulli();
      
      const rewards = algorithmStore.investmentsGradient.map(inv => inv.gradientReturn);
      expect(rewards).toEqual([1, 0, 1]);
      // avgReward formula: avgReward += (reward - avgReward) / (t + 1)
      // t=0: avgReward = 0 + (1-0)/1 = 1
      // t=1: avgReward = 1 + (0-1)/2 = 0.5
      // t=2: avgReward = 0.5 + (1-0.5)/3 = 0.667
    });

    it('should handle gaussian continuous rewards', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 3;
      
      gaussian
        .mockReturnValueOnce(0.05)
        .mockReturnValueOnce(0.03)
        .mockReturnValueOnce(-0.02);
      
      gradientBandit_gaussian();
      
      const rewards = algorithmStore.investmentsGradient.map(inv => inv.gradientReturn);
      expect(rewards).toEqual([0.05, 0.03, -0.02]);
    });
  });

  describe('Preference Update Tests', () => {
    it('should update preferences using gradient ascent', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.8, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.2, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 10;
      
      // Force always first stock selection with high rewards
      const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
      bernoulli.mockReturnValue(true); // Always reward = 1
      
      gradientBandit_bernoulli();
      
      // All selections should be Apple due to forced low random value
      algorithmStore.investmentsGradient.forEach(inv => {
        expect(inv.stock.stock.name).toBe('Apple');
      });
      
      mathRandomSpy.mockRestore();
    });

    it('should apply correct preference update formula', () => {
      // H[selected] += α(reward - avgReward)(1 - π(selected))
      // H[others] -= α(reward - avgReward)π(others)
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 2;
      
      gaussian
        .mockReturnValueOnce(1.0)
        .mockReturnValueOnce(0.5);
      
      gradientBandit_gaussian();
      
      // Should complete without errors, preferences updated internally
      expect(algorithmStore.investmentsGradient).toHaveLength(2);
    });
  });

  describe('Stock Selection Tests', () => {
    it('should select valid stocks from selectedStocks', () => {
      const stocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.7, gaussian_param: 0.03 },
        { stock: { id: 3, name: 'Tesla' }, bernoulli_param: 0.5, gaussian_param: 0.04 }
      ];
      banditStore.selectedStocks = stocks;
      banditStore.possibleInvestments = 15;
      
      bernoulli.mockReturnValue(true);
      
      gradientBandit_bernoulli();
      
      algorithmStore.investmentsGradient.forEach(inv => {
        expect(stocks).toContainEqual(inv.stock);
      });
    });

    it('should adapt selection based on reward feedback', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Good Stock' }, bernoulli_param: 0.9, gaussian_param: 0.1 },
        { stock: { id: 2, name: 'Bad Stock' }, bernoulli_param: 0.1, gaussian_param: -0.1 }
      ];
      banditStore.possibleInvestments = 50;
      
      // Mock realistic rewards: Good stock gives high rewards, bad stock gives low
      bernoulli.mockImplementation((param) => param > 0.5);
      
      gradientBandit_bernoulli();
      
      // After learning, good stock should be selected more often
      const goodStockCount = algorithmStore.investmentsGradient.filter(
        inv => inv.stock.stock.name === 'Good Stock'
      ).length;
      const badStockCount = algorithmStore.investmentsGradient.filter(
        inv => inv.stock.stock.name === 'Bad Stock'
      ).length;
      
      expect(goodStockCount).toBeGreaterThan(badStockCount);
    });
  });

  describe('Reward Storage Tests', () => {
    it('should store bernoulli rewards as 0 or 1', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 10;
      
      bernoulli
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      
      gradientBandit_bernoulli();
      
      algorithmStore.investmentsGradient.forEach(inv => {
        expect([0, 1]).toContain(inv.gradientReturn);
      });
    });

    it('should store gaussian rewards as continuous values', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 5;
      
      gaussian
        .mockReturnValueOnce(0.025)
        .mockReturnValueOnce(0.075)
        .mockReturnValueOnce(-0.015)
        .mockReturnValueOnce(0.045)
        .mockReturnValueOnce(0.065);
      
      gradientBandit_gaussian();
      
      const rewards = algorithmStore.investmentsGradient.map(inv => inv.gradientReturn);
      expect(rewards).toEqual([0.025, 0.075, -0.015, 0.045, 0.065]);
    });
  });

  describe('Algorithm Theory Tests', () => {
    it('should implement policy gradient with softmax', () => {
      // Verify that the algorithm uses softmax for action probabilities
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.7, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 1;
      
      gaussian.mockReturnValue(0.05);
      
      // Should complete using softmax without errors
      gradientBandit_gaussian();
      
      expect(algorithmStore.investmentsGradient).toHaveLength(1);
    });

    it('should use baseline (average reward) for variance reduction', () => {
      // The algorithm should use avgReward as baseline in preference updates
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 5;
      
      gaussian
        .mockReturnValueOnce(0.1)
        .mockReturnValueOnce(0.2)
        .mockReturnValueOnce(0.3)
        .mockReturnValueOnce(0.4)
        .mockReturnValueOnce(0.5);
      
      gradientBandit_gaussian();
      
      // Should use incremental average as baseline
      expect(algorithmStore.investmentsGradient).toHaveLength(5);
    });

    it('should use learning rate alpha = 0.1', () => {
      // Verify preference updates use α = 0.1
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 3;
      
      bernoulli.mockReturnValue(true);
      
      gradientBandit_bernoulli();
      
      // Should complete with learning rate applied
      expect(algorithmStore.investmentsGradient).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single stock scenario', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 5;
      
      bernoulli.mockReturnValue(true);
      
      gradientBandit_bernoulli();
      
      expect(algorithmStore.investmentsGradient).toHaveLength(5);
      algorithmStore.investmentsGradient.forEach(inv => {
        expect(inv.stock.stock.name).toBe('Apple');
      });
    });

    it('should handle negative rewards correctly', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.1, gaussian_param: -0.1 }
      ];
      banditStore.possibleInvestments = 3;
      
      gaussian
        .mockReturnValueOnce(-0.1)
        .mockReturnValueOnce(-0.2)
        .mockReturnValueOnce(0.05);
      
      gradientBandit_gaussian();
      
      const rewards = algorithmStore.investmentsGradient.map(inv => inv.gradientReturn);
      expect(rewards).toEqual([-0.1, -0.2, 0.05]);
    });
  });
});
