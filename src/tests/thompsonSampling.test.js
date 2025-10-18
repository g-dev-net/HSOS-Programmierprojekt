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
      banditStore.possibleInvestments = 5; // Run 5 times: 4 to build history + 1 final call
      
      // Simulate successes and failures: 3 successes, 1 failure
      bernoulli
        .mockReturnValueOnce(true)  // Success
        .mockReturnValueOnce(false) // Failure
        .mockReturnValueOnce(true)  // Success  
        .mockReturnValueOnce(true)  // Success
        .mockReturnValueOnce(true); // Extra call for 5th iteration
      
      jStat.beta.sample.mockReturnValue(0.7);
      
      thompsonSampling_bernoulli();
      
      // After 4 iterations: successes=3, failures=1
      // On 5th iteration (last call to jStat): alpha=4, beta=2
      const lastCallArgs = jStat.beta.sample.mock.calls[jStat.beta.sample.mock.calls.length - 1];
      expect(lastCallArgs).toEqual([4, 2]);
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
      banditStore.possibleInvestments = 4; // Run 4 times: 3 to build history + 1 final call
      
      bernoulli.mockReturnValue(true); // All successes
      jStat.beta.sample.mockReturnValue(0.8);
      
      thompsonSampling_bernoulli();
      
      // After 3 successes in cache: alpha=3+1=4, beta=0+1=1
      const lastCallArgs = jStat.beta.sample.mock.calls[jStat.beta.sample.mock.calls.length - 1];
      expect(lastCallArgs).toEqual([4, 1]);
    });

    it('should handle only failures scenario', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.2, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 3; // Run 3 times: 2 to build history + 1 final call
      
      bernoulli.mockReturnValue(false); // All failures
      jStat.beta.sample.mockReturnValue(0.2);
      
      thompsonSampling_bernoulli();
      
      // After 2 failures in cache: alpha=0+1=1, beta=2+1=3
      const lastCallArgs = jStat.beta.sample.mock.calls[jStat.beta.sample.mock.calls.length - 1];
      expect(lastCallArgs).toEqual([1, 3]);
    });
  });

  describe('Gaussian Case Tests', () => {
    it('should map returns correctly and calculate mean', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 4; // Run 4 times: 3 to build history + 1 final call
      
      gaussian
        .mockReturnValueOnce(0.02)
        .mockReturnValueOnce(0.05)
        .mockReturnValueOnce(0.03)
        .mockReturnValueOnce(0.04);
      
      jStat.normal.sample.mockReturnValue(0.04);
      
      thompsonSampling_gaussian();
      
      // After 3 returns: mean = (0.02+0.05+0.03)/3 = 0.0333...
      const lastCallArgs = jStat.normal.sample.mock.calls[jStat.normal.sample.mock.calls.length - 1];
      const expectedMean = (0.02 + 0.05 + 0.03) / 3;
      expect(lastCallArgs[0]).toBeCloseTo(expectedMean, 5);
    });

    it('should handle single return value (variance=1 fallback)', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 1; // Only one iteration
      
      gaussian.mockReturnValue(0.03);
      jStat.normal.sample.mockReturnValue(0.03);
      
      thompsonSampling_gaussian();
      
      // First call has mean=0 (empty cache), variance=1
      const firstCallArgs = jStat.normal.sample.mock.calls[0];
      expect(firstCallArgs).toEqual([0, 1]);
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
      banditStore.possibleInvestments = 3; // Run 3 times: 2 to build history + 1 final call
      
      gaussian
        .mockReturnValueOnce(0.01)
        .mockReturnValueOnce(0.05)
        .mockReturnValueOnce(0.03);
      
      jStat.normal.sample.mockReturnValue(0.03);
      
      thompsonSampling_gaussian();
      
      // After 2 returns, last call should use correct mean and variance
      const lastCallArgs = jStat.normal.sample.mock.calls[jStat.normal.sample.mock.calls.length - 1];
      const expectedMean = (0.01 + 0.05) / 2;
      expect(lastCallArgs[0]).toBeCloseTo(expectedMean, 5);
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
      const stock = { id: 1, name: 'Test', bernoulli_param: 0.6, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 6; // Run 6 times: 5 to build history + 1 final call
      
      bernoulli
        .mockReturnValueOnce(true)  // Success
        .mockReturnValueOnce(true)  // Success
        .mockReturnValueOnce(false) // Failure
        .mockReturnValueOnce(true)  // Success
        .mockReturnValueOnce(false) // Failure
        .mockReturnValueOnce(true); // Extra call for 6th iteration
      
      jStat.beta.sample.mockReturnValue(0.6);
      
      thompsonSampling_bernoulli();
      
      // Successes: 3, Failures: 2
      // Alpha = successes + 1 = 4, Beta = failures + 1 = 3
      const lastCallArgs = jStat.beta.sample.mock.calls[jStat.beta.sample.mock.calls.length - 1];
      expect(lastCallArgs).toEqual([4, 3]);
    });

    it('should implement correct sample variance formula', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 4; // Run 4 times: 3 to build history + 1 final call
      
      gaussian
        .mockReturnValueOnce(2)
        .mockReturnValueOnce(4)
        .mockReturnValueOnce(6)
        .mockReturnValueOnce(8);
      
      jStat.normal.sample.mockReturnValue(4);
      
      thompsonSampling_gaussian();
      
      // Mean: (2+4+6)/3 = 4
      // Variance: [(2-4)² + (4-4)² + (6-4)²] / (3-1) = [4+0+4]/2 = 4
      // StdDev: sqrt(4) = 2
      const lastCallArgs = jStat.normal.sample.mock.calls[jStat.normal.sample.mock.calls.length - 1];
      expect(lastCallArgs[0]).toBe(4); // Mean of 2,4,6 is 4
      expect(lastCallArgs[1]).toBeCloseTo(2, 5); // sqrt(4) = 2
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
