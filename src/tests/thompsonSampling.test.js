import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { thompsonSampling_bernoulli, thompsonSampling_gaussian } from '../algorithms/thompsonSampling.ts';
import { useBanditStore } from '@/stores/bandit';
import { useAlgorithmStore } from '@/stores/algorithms';
import { bernoulli } from '../bandits/bernoulli.js';
import { gaussian } from '../bandits/gaussian.js';
import jStat from 'jstat';

// Mock bandit functions for predictable testing
vi.mock('../bandits/bernoulli.js', () => ({
  bernoulli: vi.fn()
}));

vi.mock('../bandits/gaussian.js', () => ({
  gaussian: vi.fn()
}));

// Mock jStat for testing integration
vi.mock('jstat', () => ({
  default: {
    beta: {
      sample: vi.fn()
    },
    normal: {
      sample: vi.fn()
    }
  }
}));

describe('Thompson Sampling Algorithm', () => {
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
    algorithmStore.investmentsThompson = [];
    algorithmStore.algorithmsInProgress = false;
    
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('Store Integration', () => {
    it('should access bandit store correctly', () => {
      banditStore.selectedStocks = [
        { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 1;
      
      expect(banditStore.selectedStocks).toHaveLength(1);
      expect(banditStore.possibleInvestments).toBe(1);
    });

    it('should access algorithm store correctly', () => {
      algorithmStore.investmentsThompson = [
        { stock: { id: 1 }, thompsonReturn: 1, greedyReturn: null }
      ];
      
      expect(algorithmStore.investmentsThompson).toHaveLength(1);
    });

    it('should set algorithmsInProgress flag', () => {
      banditStore.selectedStocks = [
        { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 1;
      bernoulli.mockReturnValue(true);
      jStat.beta.sample.mockReturnValue(0.7);
      
      thompsonSampling_bernoulli();
      
      expect(algorithmStore.algorithmsInProgress).toBe(false); // Should be false after completion
    });
  });

  describe('arm_investments Filter Tests', () => {
    it('should filter investments by specific stock', () => {
      const stock1 = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      const stock2 = { id: 2, name: 'Google', bernoulli_param: 0.7, gaussian_param: 0.03 };
      
      banditStore.selectedStocks = [stock1, stock2];
      banditStore.possibleInvestments = 1;
      
      // Pre-populate with mixed investments
      algorithmStore.investmentsThompson = [
        { stock: stock1, thompsonReturn: 1, greedyReturn: null },
        { stock: stock2, thompsonReturn: 0, greedyReturn: null },
        { stock: stock1, thompsonReturn: 0, greedyReturn: null },
        { stock: stock2, thompsonReturn: 1, greedyReturn: null },
        { stock: stock1, thompsonReturn: 1, greedyReturn: null }
      ];
      
      jStat.beta.sample.mockReturnValue(0.5);
      bernoulli.mockReturnValue(true);
      
      thompsonSampling_bernoulli();
      
      // The algorithm should have filtered investments correctly
      // Verify that the filtering logic works by checking that new investment was added
      expect(algorithmStore.investmentsThompson).toHaveLength(6); // 5 initial + 1 new
      
      // Verify that the filter operation worked during execution
      // The new investment should reference one of the stocks
      const lastInvestment = algorithmStore.investmentsThompson[algorithmStore.investmentsThompson.length - 1];
      expect([stock1, stock2]).toContainEqual(lastInvestment.stock);
    });

    it('should handle empty arm_investments for new stocks', () => {
      const newStock = { id: 3, name: 'Tesla', bernoulli_param: 0.5, gaussian_param: 0.04 };
      
      banditStore.selectedStocks = [newStock];
      banditStore.possibleInvestments = 1;
      algorithmStore.investmentsThompson = []; // No previous investments
      
      jStat.beta.sample.mockReturnValue(0.6);
      bernoulli.mockReturnValue(false);
      
      thompsonSampling_bernoulli();
      
      // Should work with empty arm_investments (uninformative prior)
      expect(jStat.beta.sample).toHaveBeenCalledWith(1, 1); // Alpha=1, Beta=1 for new stock
      expect(algorithmStore.investmentsThompson).toHaveLength(1);
    });
  });

  describe('Bernoulli Case Tests', () => {
    it('should count successes and failures correctly', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 1;
      
      // Pre-populate with known successes/failures
      algorithmStore.investmentsThompson = [
        { stock: stock, thompsonReturn: 1, greedyReturn: null }, // Success
        { stock: stock, thompsonReturn: 0, greedyReturn: null }, // Failure
        { stock: stock, thompsonReturn: 1, greedyReturn: null }, // Success
        { stock: stock, thompsonReturn: 1, greedyReturn: null }  // Success
      ];
      
      jStat.beta.sample.mockReturnValue(0.7);
      bernoulli.mockReturnValue(true);
      
      thompsonSampling_bernoulli();
      
      // Should calculate: successes=3, failures=1, alpha=4, beta=2
      expect(jStat.beta.sample).toHaveBeenCalledWith(4, 2);
    });

    it('should apply uninformative prior correctly', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 1;
      algorithmStore.investmentsThompson = []; // No previous data
      
      jStat.beta.sample.mockReturnValue(0.5);
      bernoulli.mockReturnValue(true);
      
      thompsonSampling_bernoulli();
      
      // With no data: successes=0, failures=0, alpha=0+1=1, beta=0+1=1
      expect(jStat.beta.sample).toHaveBeenCalledWith(1, 1);
    });

    it('should handle only successes scenario', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.8, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 1;
      
      algorithmStore.investmentsThompson = [
        { stock: stock, thompsonReturn: 1, greedyReturn: null },
        { stock: stock, thompsonReturn: 1, greedyReturn: null },
        { stock: stock, thompsonReturn: 1, greedyReturn: null }
      ];
      
      jStat.beta.sample.mockReturnValue(0.9);
      bernoulli.mockReturnValue(true);
      
      thompsonSampling_bernoulli();
      
      // successes=3, failures=0, alpha=4, beta=1
      expect(jStat.beta.sample).toHaveBeenCalledWith(4, 1);
    });

    it('should handle only failures scenario', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.2, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 1;
      
      algorithmStore.investmentsThompson = [
        { stock: stock, thompsonReturn: 0, greedyReturn: null },
        { stock: stock, thompsonReturn: 0, greedyReturn: null }
      ];
      
      jStat.beta.sample.mockReturnValue(0.1);
      bernoulli.mockReturnValue(false);
      
      thompsonSampling_bernoulli();
      
      // successes=0, failures=2, alpha=1, beta=3
      expect(jStat.beta.sample).toHaveBeenCalledWith(1, 3);
    });
  });

  describe('Gaussian Case Tests', () => {
    it('should map returns correctly and calculate mean', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 1;
      
      algorithmStore.investmentsThompson = [
        { stock: stock, thompsonReturn: 0.02, greedyReturn: null },
        { stock: stock, thompsonReturn: 0.05, greedyReturn: null },
        { stock: stock, thompsonReturn: 0.03, greedyReturn: null }
      ];
      
      jStat.normal.sample.mockReturnValue(0.04);
      gaussian.mockReturnValue(0.045);
      
      thompsonSampling_gaussian();
      
      // Mean should be (0.02 + 0.05 + 0.03) / 3 = 0.033333...
      const expectedMean = (0.02 + 0.05 + 0.03) / 3;
      // Variance calculation: sum of squared deviations / (n-1)
      const deviations = [0.02 - expectedMean, 0.05 - expectedMean, 0.03 - expectedMean];
      const expectedVariance = deviations.reduce((sum, dev) => sum + dev * dev, 0) / (deviations.length - 1);
      const expectedStdDev = Math.sqrt(expectedVariance);
      
      expect(jStat.normal.sample).toHaveBeenCalledWith(expectedMean, expectedStdDev);
    });

    it('should handle single return value (variance=1 fallback)', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 1;
      
      algorithmStore.investmentsThompson = [
        { stock: stock, thompsonReturn: 0.03, greedyReturn: null }
      ];
      
      jStat.normal.sample.mockReturnValue(0.035);
      gaussian.mockReturnValue(0.032);
      
      thompsonSampling_gaussian();
      
      // With only one value: mean=0.03, variance=1 (fallback)
      expect(jStat.normal.sample).toHaveBeenCalledWith(0.03, 1);
    });

    it('should handle empty returns (mean=0, variance=1)', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 1;
      algorithmStore.investmentsThompson = []; // No previous data
      
      jStat.normal.sample.mockReturnValue(0.01);
      gaussian.mockReturnValue(0.015);
      
      thompsonSampling_gaussian();
      
      // With no data: mean=0, variance=1
      expect(jStat.normal.sample).toHaveBeenCalledWith(0, 1);
    });

    it('should calculate variance correctly with multiple values', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 1;
      
      algorithmStore.investmentsThompson = [
        { stock: stock, thompsonReturn: 0.01, greedyReturn: null },
        { stock: stock, thompsonReturn: 0.05, greedyReturn: null }
      ];
      
      jStat.normal.sample.mockReturnValue(0.03);
      gaussian.mockReturnValue(0.035);
      
      thompsonSampling_gaussian();
      
      // Mean: (0.01 + 0.05) / 2 = 0.03
      // Variance: [(0.01-0.03)² + (0.05-0.03)²] / (2-1) = [0.0004 + 0.0004] / 1 = 0.0008
      // StdDev: sqrt(0.0008) ≈ 0.02828427
      const expectedMean = (0.01 + 0.05) / 2;
      const expectedVariance = (Math.pow(0.01 - expectedMean, 2) + Math.pow(0.05 - expectedMean, 2)) / 1;
      const expectedStdDev = Math.sqrt(expectedVariance);
      
      expect(jStat.normal.sample).toHaveBeenCalledWith(expectedMean, expectedStdDev);
    });
  });

  describe('jStat Integration Tests', () => {
    it('should call jStat.beta.sample with correct parameters', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 2;
      
      jStat.beta.sample.mockReturnValue(0.65);
      bernoulli.mockReturnValue(true);
      
      thompsonSampling_bernoulli();
      
      expect(jStat.beta.sample).toHaveBeenCalled();
      expect(jStat.beta.sample).toHaveBeenCalledWith(1, 1); // Uninformative prior
    });

    it('should call jStat.normal.sample with correct parameters', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 1;
      
      jStat.normal.sample.mockReturnValue(0.04);
      gaussian.mockReturnValue(0.045);
      
      thompsonSampling_gaussian();
      
      expect(jStat.normal.sample).toHaveBeenCalled();
      expect(jStat.normal.sample).toHaveBeenCalledWith(0, 1); // Default parameters for empty data
    });

    it('should use jStat sample values for arm selection', () => {
      const stock1 = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      const stock2 = { id: 2, name: 'Google', bernoulli_param: 0.7, gaussian_param: 0.03 };
      
      banditStore.selectedStocks = [stock1, stock2];
      banditStore.possibleInvestments = 1;
      
      // Mock different sampled values to test selection logic
      jStat.beta.sample
        .mockReturnValueOnce(0.3) // Lower value for stock1
        .mockReturnValueOnce(0.8); // Higher value for stock2
      
      bernoulli.mockReturnValue(true);
      
      thompsonSampling_bernoulli();
      
      expect(jStat.beta.sample).toHaveBeenCalledTimes(2);
      expect(algorithmStore.investmentsThompson).toHaveLength(1);
      // The chosen stock should be stock2 (higher sampled value)
      expect(algorithmStore.investmentsThompson[0].stock).toStrictEqual(stock2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle no stocks scenario', () => {
      banditStore.selectedStocks = [];
      banditStore.possibleInvestments = 1;
      
      // Should throw error or handle gracefully
      expect(() => thompsonSampling_bernoulli()).toThrow();
      expect(jStat.beta.sample).not.toHaveBeenCalled();
    });

    it('should handle zero possibleInvestments', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 0;
      
      thompsonSampling_bernoulli();
      
      expect(algorithmStore.investmentsThompson).toHaveLength(0);
      expect(jStat.beta.sample).not.toHaveBeenCalled();
    });

    it('should maintain consistent algorithmsInProgress state', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 1;
      
      jStat.beta.sample.mockReturnValue(0.5);
      bernoulli.mockReturnValue(true);
      
      expect(algorithmStore.algorithmsInProgress).toBe(false);
      
      thompsonSampling_bernoulli();
      
      expect(algorithmStore.algorithmsInProgress).toBe(false); // Should be reset after completion
    });
  });

  describe('Mathematical Correctness', () => {
    it('should implement correct Beta distribution parameters formula', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 1;
      
      algorithmStore.investmentsThompson = [
        { stock: stock, thompsonReturn: 1, greedyReturn: null },
        { stock: stock, thompsonReturn: 1, greedyReturn: null },
        { stock: stock, thompsonReturn: 0, greedyReturn: null },
        { stock: stock, thompsonReturn: 1, greedyReturn: null },
        { stock: stock, thompsonReturn: 0, greedyReturn: null }
      ];
      
      jStat.beta.sample.mockReturnValue(0.6);
      bernoulli.mockReturnValue(true);
      
      thompsonSampling_bernoulli();
      
      // Successes: 3, Failures: 2
      // Alpha = successes + 1 = 4, Beta = failures + 1 = 3
      expect(jStat.beta.sample).toHaveBeenCalledWith(4, 3);
    });

    it('should implement correct sample variance formula', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 1;
      
      algorithmStore.investmentsThompson = [
        { stock: stock, thompsonReturn: 2, greedyReturn: null },
        { stock: stock, thompsonReturn: 4, greedyReturn: null },
        { stock: stock, thompsonReturn: 6, greedyReturn: null }
      ];
      
      jStat.normal.sample.mockReturnValue(4.5);
      gaussian.mockReturnValue(4.2);
      
      thompsonSampling_gaussian();
      
      // Mean: (2+4+6)/3 = 4
      // Variance: [(2-4)² + (4-4)² + (6-4)²] / (3-1) = [4+0+4]/2 = 4
      // StdDev: sqrt(4) = 2
      expect(jStat.normal.sample).toHaveBeenCalledWith(4, 2);
    });

    it('should verify uninformative prior implementation', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.5, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 1;
      algorithmStore.investmentsThompson = [];
      
      jStat.beta.sample.mockReturnValue(0.5);
      bernoulli.mockReturnValue(false);
      
      thompsonSampling_bernoulli();
      
      // Uninformative prior: Beta(1,1) - uniform distribution
      expect(jStat.beta.sample).toHaveBeenCalledWith(1, 1);
    });
  });
});
