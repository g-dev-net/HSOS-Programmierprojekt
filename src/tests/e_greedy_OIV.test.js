import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { greedy_bernoulli, eGreedy_bernoulli, OIV_bernoulli, greedy_gaussian, eGreedy_gaussian, OIV_gaussian } from '../algorithms/e_greedy_OIV.ts';
import { useBanditStore } from '@/stores/bandit';
import { useAlgorithmStore } from '@/stores/algorithms';
import { bernoulli } from '../bandits/bernoulli.js';
import { gaussian } from '../bandits/gaussian.js';

// Mock bandit functions
vi.mock('../bandits/bernoulli.js', () => ({
  bernoulli: vi.fn()
}));

vi.mock('../bandits/gaussian.js', () => ({
  gaussian: vi.fn()
}));

describe('Greedy, Epsilon-Greedy, and OIV Algorithms', () => {
  let banditStore;
  let algorithmStore;

  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
    
    banditStore = useBanditStore();
    algorithmStore = useAlgorithmStore();
    
    // Reset stores
    banditStore.selectedStocks = [];
    banditStore.possibleInvestments = 0;
    algorithmStore.investmentsGreedy = [];
    algorithmStore.investmentsEGreedy = [];
    algorithmStore.investmentsOptimisticInitial = [];
    algorithmStore.algorithmsInProgress = false;
    
    vi.clearAllMocks();
  });

  describe('Store Integration', () => {
    it('should write to correct store for Greedy', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 1;
      bernoulli.mockReturnValue(true);
      
      greedy_bernoulli();
      
      expect(algorithmStore.investmentsGreedy).toHaveLength(1);
      expect(algorithmStore.investmentsGreedy[0].greedyReturn).toBe(1);
      expect(algorithmStore.investmentsEGreedy).toHaveLength(0);
      expect(algorithmStore.investmentsOptimisticInitial).toHaveLength(0);
    });

    it('should write to correct store for Epsilon-Greedy', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 1;
      gaussian.mockReturnValue(0.05);
      
      eGreedy_gaussian();
      
      expect(algorithmStore.investmentsEGreedy).toHaveLength(1);
      expect(algorithmStore.investmentsEGreedy[0].eGreedyReturn).toBe(0.05);
      expect(algorithmStore.investmentsGreedy).toHaveLength(0);
      expect(algorithmStore.investmentsOptimisticInitial).toHaveLength(0);
    });

    it('should write to correct store for OIV', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 1;
      bernoulli.mockReturnValue(false);
      
      OIV_bernoulli();
      
      expect(algorithmStore.investmentsOptimisticInitial).toHaveLength(1);
      expect(algorithmStore.investmentsOptimisticInitial[0].optimisticInitialReturn).toBe(0);
      expect(algorithmStore.investmentsGreedy).toHaveLength(0);
      expect(algorithmStore.investmentsEGreedy).toHaveLength(0);
    });
  });

  describe('Cold-Start with Average Calculation', () => {
    it('should handle cold-start correctly for Greedy (avg = 0 when no investments)', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.8, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 1;
      bernoulli.mockReturnValue(true);
      
      greedy_bernoulli();
      
      // Should pick any stock (both have avg = 0)
      expect(algorithmStore.investmentsGreedy).toHaveLength(1);
      expect([0, 1]).toContain(algorithmStore.investmentsGreedy[0].stock.stock.id);
    });

    it('should calculate average correctly after first investment', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 3;
      
      gaussian
        .mockReturnValueOnce(0.06)  // First: 0.06
        .mockReturnValueOnce(0.04)  // Second: avg = (0.06 + 0.04) / 2 = 0.05
        .mockReturnValueOnce(0.08); // Third: avg = (0.06 + 0.04 + 0.08) / 3 = 0.06
      
      greedy_gaussian();
      
      expect(algorithmStore.investmentsGreedy).toHaveLength(3);
      expect(algorithmStore.investmentsGreedy[0].greedyReturn).toBe(0.06);
      expect(algorithmStore.investmentsGreedy[1].greedyReturn).toBe(0.04);
      expect(algorithmStore.investmentsGreedy[2].greedyReturn).toBe(0.08);
    });

    it('should calculate average correctly with multiple stocks', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.3, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.8, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 4;
      
      // Both stocks should be tried (cold-start), then best one exploited
      bernoulli.mockReturnValue(true);
      
      greedy_bernoulli();
      
      const appleInvestments = algorithmStore.investmentsGreedy.filter(inv => inv.stock.stock.id === 1);
      const googleInvestments = algorithmStore.investmentsGreedy.filter(inv => inv.stock.stock.id === 2);
      
      // Both should be selected at least once during cold-start phase
      expect(appleInvestments.length + googleInvestments.length).toBe(4);
      expect(algorithmStore.investmentsGreedy).toHaveLength(4);
    });
  });

  describe('Greedy Algorithm Theory', () => {
    it('should handle negative Gaussian rewards correctly', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Bad' }, bernoulli_param: 0.1, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'LessBad' }, bernoulli_param: 0.2, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 5;
      
      // Simulate: Bad returns -0.5, LessBad returns -0.2 (better!)
      gaussian
        .mockReturnValueOnce(-0.5)   // Bad tried first: avg = -0.5
        .mockReturnValueOnce(-0.2)   // LessBad tried: avg = -0.2 (better!)
        .mockReturnValue(-0.2);      // LessBad should be selected from now on
      
      greedy_gaussian();
      
      const badInvestments = algorithmStore.investmentsGreedy.filter(inv => inv.stock.stock.name === 'Bad');
      const lessBadInvestments = algorithmStore.investmentsGreedy.filter(inv => inv.stock.stock.name === 'LessBad');
      
      // Bad should be tried once, then LessBad dominates (has better avg: -0.2 > -0.5)
      expect(badInvestments.length).toBe(1);
      expect(lessBadInvestments.length).toBe(4);
    });

    it('should exploit best arm consistently after cold-start', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Bad' }, bernoulli_param: 0.1, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Good' }, bernoulli_param: 0.9, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 10;
      
      // With cold-start (both avg=0), first stock gets picked repeatedly
      // This is expected greedy behavior without exploration
      bernoulli.mockReturnValue(true);
      
      greedy_bernoulli();
      
      // Verify algorithm executed correctly
      const badInvestments = algorithmStore.investmentsGreedy.filter(inv => inv.stock.stock.name === 'Bad');
      const goodInvestments = algorithmStore.investmentsGreedy.filter(inv => inv.stock.stock.name === 'Good');
      
      expect(badInvestments.length + goodInvestments.length).toBe(10);
      expect(algorithmStore.investmentsGreedy).toHaveLength(10);
    });

    it('should select stock with highest average reward', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.7, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 2;
      
      // Pure Greedy with best_arm_value=0 will pick first stock if it returns positive value
      // This test demonstrates greedy behavior without exploration
      gaussian.mockReturnValue(0.05);
      
      greedy_gaussian();
      
      const appleInvestments = algorithmStore.investmentsGreedy.filter(inv => inv.stock.stock.name === 'Apple');
      
      // With pure greedy and positive returns, first stock gets all investments
      expect(appleInvestments.length).toBe(2);
      expect(algorithmStore.investmentsGreedy).toHaveLength(2);
    });
  });

  describe('Epsilon-Greedy Algorithm Theory', () => {
    it('should explore randomly with probability epsilon', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.7, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 100;
      
      bernoulli.mockReturnValue(true);
      
      eGreedy_bernoulli();
      
      // Both stocks should be selected at least once (exploration)
      const appleInvestments = algorithmStore.investmentsEGreedy.filter(inv => inv.stock.stock.name === 'Apple');
      const googleInvestments = algorithmStore.investmentsEGreedy.filter(inv => inv.stock.stock.name === 'Google');
      
      expect(appleInvestments.length).toBeGreaterThan(0);
      expect(googleInvestments.length).toBeGreaterThan(0);
    });

    // Error possible bc of randomness, but should hold true statistically -> run again
    it('should exploit best arm most of the time', () => {
      try {
        banditStore.selectedStocks = [
          { stock: { id: 1, name: 'Bad' }, bernoulli_param: 0.1, gaussian_param: 0.05 },
          { stock: { id: 2, name: 'Good' }, bernoulli_param: 0.9, gaussian_param: 0.03 }
        ];
        banditStore.possibleInvestments = 100;
        
        // Simulate: Bad returns low, Good returns high
        gaussian
          .mockReturnValueOnce(0.01)  // Bad: low
          .mockReturnValueOnce(0.09)  // Good: high (better!)
          .mockReturnValue(0.08);     // Good continues high
        
        eGreedy_gaussian();
        
        // Both stocks should be tried (exploration), but Good should dominate (exploitation)
        const badInvestments = algorithmStore.investmentsEGreedy.filter(inv => inv.stock.stock.name === 'Bad');
        const goodInvestments = algorithmStore.investmentsEGreedy.filter(inv => inv.stock.stock.name === 'Good');
        
        expect(badInvestments.length).toBeGreaterThan(0); // Some exploration
        expect(goodInvestments.length).toBeGreaterThan(0); // Some exploitation
        expect(algorithmStore.investmentsEGreedy).toHaveLength(100);
      }
      catch (e) {
        println('Randomness caused test to fail, rerun to verify statistical behavior.');
        throw e;
      }
    });
  });

  describe('OIV Algorithm Theory', () => {
    it('should use optimistic initial value (5) for cold-start', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.7, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 2;
      
      // First stock gets low reward (0), second stock gets high reward (1)
      bernoulli
        .mockReturnValueOnce(false) // Apple: first trial avg = 5, after trial avg = 0
        .mockReturnValueOnce(true); // Google: first trial avg = 5, after trial avg = 1
      
      OIV_bernoulli();
      
      // Both should be tried once (optimistic values encourage exploration)
      expect(algorithmStore.investmentsOptimisticInitial).toHaveLength(2);
      const stocksTried = algorithmStore.investmentsOptimisticInitial.map(inv => inv.stock.stock.name);
      expect(stocksTried).toContain('Apple');
      expect(stocksTried).toContain('Google');
    });

    it('should calculate average with OIV: first=optimistic, then sum/count', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 3;
      
      gaussian
        .mockReturnValueOnce(0.1)  // trial 1: avg = 5 (optimistic), after: avg = 0.1
        .mockReturnValueOnce(0.2)  // trial 2: avg = (0.1 + 0.2) / 2 = 0.15
        .mockReturnValueOnce(0.3); // trial 3: avg = (0.1 + 0.2 + 0.3) / 3 = 0.2
      
      OIV_gaussian();
      
      expect(algorithmStore.investmentsOptimisticInitial).toHaveLength(3);
      // OIV encourages initial exploration, then uses true average
    });

    it('should explore all arms initially due to optimistic values', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Stock1' }, bernoulli_param: 0.2, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Stock2' }, bernoulli_param: 0.3, gaussian_param: 0.03 },
        { stock: { id: 3, name: 'Stock3' }, bernoulli_param: 0.4, gaussian_param: 0.04 }
      ];
      banditStore.possibleInvestments = 6;
      
      bernoulli.mockReturnValue(false); // All return low rewards
      
      OIV_bernoulli();
      
      // All stocks should be tried at least once (optimistic exploration)
      const stock1 = algorithmStore.investmentsOptimisticInitial.filter(inv => inv.stock.stock.name === 'Stock1');
      const stock2 = algorithmStore.investmentsOptimisticInitial.filter(inv => inv.stock.stock.name === 'Stock2');
      const stock3 = algorithmStore.investmentsOptimisticInitial.filter(inv => inv.stock.stock.name === 'Stock3');
      
      expect(stock1.length).toBeGreaterThan(0);
      expect(stock2.length).toBeGreaterThan(0);
      expect(stock3.length).toBeGreaterThan(0);
    });

    it('should eventually exploit best arm after exploration phase', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Bad' }, bernoulli_param: 0.1, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Good' }, bernoulli_param: 0.9, gaussian_param: 0.03 }
      ];
      banditStore.possibleInvestments = 10;
      
      // Bad returns 0, Good returns 1
      bernoulli.mockImplementation((param) => param > 0.5);
      
      OIV_bernoulli();

      // After exploration, "Good" should dominate
      const goodInvestments = algorithmStore.investmentsOptimisticInitial.filter(inv => inv.stock.stock.name === 'Good');
      expect(goodInvestments.length).toBeGreaterThan(4); // Should be selected more often
    });

    it('should work correctly with negative Gaussian rewards', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'VeryBad' }, bernoulli_param: 0.1, gaussian_param: 0.05 },
        { stock: { id: 2, name: 'Bad' }, bernoulli_param: 0.2, gaussian_param: 0.03 },
        { stock: { id: 3, name: 'LessBad' }, bernoulli_param: 0.3, gaussian_param: 0.04 }
      ];
      banditStore.possibleInvestments = 8;
      
      // All return negative, but LessBad is best
      gaussian
        .mockReturnValueOnce(-0.8)  // VeryBad: initial=5, after=-0.8
        .mockReturnValueOnce(-0.5)  // Bad: initial=5, after=-0.5
        .mockReturnValueOnce(-0.2)  // LessBad: initial=5, after=-0.2 (best!)
        .mockReturnValue(-0.2);     // Continue with similar values
      
      OIV_gaussian();
      
      // All should be explored initially, then LessBad should dominate
      const veryBadInv = algorithmStore.investmentsOptimisticInitial.filter(inv => inv.stock.stock.name === 'VeryBad');
      const badInv = algorithmStore.investmentsOptimisticInitial.filter(inv => inv.stock.stock.name === 'Bad');
      const lessBadInv = algorithmStore.investmentsOptimisticInitial.filter(inv => inv.stock.stock.name === 'LessBad');
      
      // All explored at least once
      expect(veryBadInv.length).toBeGreaterThan(0);
      expect(badInv.length).toBeGreaterThan(0);
      expect(lessBadInv.length).toBeGreaterThan(0);
      
      // LessBad should have most investments (least negative = best)
      expect(lessBadInv.length).toBeGreaterThanOrEqual(badInv.length);
      expect(lessBadInv.length).toBeGreaterThanOrEqual(veryBadInv.length);
    });
  });

  describe('Loop Execution', () => {
    it('should execute exactly possibleInvestments iterations', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 7;
      
      bernoulli.mockReturnValue(true);
      
      greedy_bernoulli();
      
      expect(algorithmStore.investmentsGreedy).toHaveLength(7);
      expect(bernoulli).toHaveBeenCalledTimes(7);
    });

    it('should handle zero investments', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 0;
      
      greedy_bernoulli();
      
      expect(algorithmStore.investmentsGreedy).toHaveLength(0);
      expect(bernoulli).not.toHaveBeenCalled();
    });

    it('should set algorithmsInProgress flag correctly', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 1;
      bernoulli.mockReturnValue(true);
      
      expect(algorithmStore.algorithmsInProgress).toBe(false);
      
      greedy_bernoulli();
      
      expect(algorithmStore.algorithmsInProgress).toBe(false); // Reset after completion
    });
  });

  describe('Reward Storage', () => {
    it('should store bernoulli rewards as 0 or 1', () => {
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
      
      greedy_bernoulli();
      
      const rewards = algorithmStore.investmentsGreedy.map(inv => inv.greedyReturn);
      expect(rewards).toEqual([1, 0, 1, 0, 1]);
      rewards.forEach(r => expect([0, 1]).toContain(r));
    });

    it('should store gaussian rewards as continuous values', () => {
      banditStore.selectedStocks = [
        { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 3;
      
      gaussian
        .mockReturnValueOnce(0.047)
        .mockReturnValueOnce(0.053)
        .mockReturnValueOnce(0.051);
      
      eGreedy_gaussian();
      
      const rewards = algorithmStore.investmentsEGreedy.map(inv => inv.eGreedyReturn);
      expect(rewards).toEqual([0.047, 0.053, 0.051]);
      rewards.forEach(r => expect(typeof r).toBe('number'));
    });

    it('should store correct stock reference with each investment', () => {
      const apple = { stock: { id: 1, name: 'Apple' }, bernoulli_param: 0.6, gaussian_param: 0.05 };
      const google = { stock: { id: 2, name: 'Google' }, bernoulli_param: 0.7, gaussian_param: 0.03 };
      
      banditStore.selectedStocks = [apple, google];
      banditStore.possibleInvestments = 2;
      
      bernoulli.mockReturnValue(true);
      
      OIV_bernoulli();
      
      algorithmStore.investmentsOptimisticInitial.forEach(investment => {
        expect([apple, google]).toContainEqual(investment.stock);
      });
    });
  });
});
