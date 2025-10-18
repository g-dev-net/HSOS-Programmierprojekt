import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { comp_algos_bernoulli, comp_algos_gaussian } from '../algorithms/compare_algos';
import { useBanditStore } from '../stores/bandit';
import { useAlgorithmStore } from '../stores/algorithms';

describe('Compare Algorithms', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    
    const banditStore = useBanditStore();
    const algorithmStore = useAlgorithmStore();
    
    // Setup test stocks
    banditStore.selectedStocks = [
      {
        stock: { id: 1, name: 'Stock A' },
        bernoulli_param: 0.7,
        gaussian_param: { mean: 0.1, stddev: 0.1 }
      },
      {
        stock: { id: 2, name: 'Stock B' },
        bernoulli_param: 0.5,
        gaussian_param: { mean: 0.05, stddev: 0.1 }
      },
      {
        stock: { id: 3, name: 'Stock C' },
        bernoulli_param: 0.3,
        gaussian_param: { mean: -0.05, stddev: 0.1 }
      }
    ];
    
    banditStore.possibleInvestments = 100;
    algorithmStore.investmentsGreedy = [];
    algorithmStore.investmentsEGreedy = [];
    algorithmStore.investmentsThompson = [];
    algorithmStore.investmentsUCB = [];
    algorithmStore.investmentsOIV = [];
    algorithmStore.investmentsGradient = [];
  });

  // ==================== Unit Tests ====================

  describe('Unit Tests - Basic Functionality', () => {
    it('should return results for selected algorithms (Bernoulli)', async () => {
      const selectedAlgos = [
        { id: 'greedy', label: 'Greedy', show: { value: true } }
      ];
      const params = {};

      const results = await comp_algos_bernoulli(
        selectedAlgos,
        10,  // runs
        20,  // iterations
        params,
        3    // armCount
      );

      expect(results).toHaveLength(1);
      expect(results[0].algorithmId).toBe('greedy');
      expect(results[0].algorithmName).toBe('Greedy');
      expect(results[0].parameter).toBeNull();
      expect(results[0].datapoints).toHaveLength(20);
    });

    it('should return results for selected algorithms (Gaussian)', async () => {
      const selectedAlgos = [
        { id: 'greedy', label: 'Greedy', show: { value: true } }
      ];
      const params = {};

      const results = await comp_algos_gaussian(
        selectedAlgos,
        10,
        20,
        params,
        3
      );

      expect(results).toHaveLength(1);
      expect(results[0].algorithmId).toBe('greedy');
      expect(results[0].datapoints).toHaveLength(20);
    });

    it('should handle multiple parameter values for epsilon-greedy', async () => {
      const selectedAlgos = [
        { id: 'eGreedy', label: 'Epsilon-Greedy', show: { value: true } }
      ];
      const params = {
        eGreedy: [0.05, 0.1, 0.2]
      };

      const results = await comp_algos_bernoulli(
        selectedAlgos,
        10,
        20,
        params,
        3
      );

      expect(results).toHaveLength(3);
      expect(results[0].parameter).toBe(0.05);
      expect(results[1].parameter).toBe(0.1);
      expect(results[2].parameter).toBe(0.2);
    });

    it('should handle multiple algorithms simultaneously', async () => {
      const selectedAlgos = [
        { id: 'greedy', label: 'Greedy', show: { value: true } },
        { id: 'thompson', label: 'Thompson', show: { value: true } },
        { id: 'eGreedy', label: 'Epsilon-Greedy', show: { value: true } }
      ];
      const params = {
        eGreedy: [0.1]
      };

      const results = await comp_algos_bernoulli(
        selectedAlgos,
        10,
        20,
        params,
        3
      );

      expect(results).toHaveLength(3); // greedy + thompson + eGreedy(0.1)
      expect(results.map(r => r.algorithmId).sort()).toEqual(['eGreedy', 'greedy', 'thompson']);
    });
  });

  // ==================== Integration Tests ====================

  describe('Integration Tests - Data Structure', () => {
    it('should return valid datapoints structure', async () => {
      const selectedAlgos = [
        { id: 'greedy', label: 'Greedy', show: { value: true } }
      ];
      const params = {};

      const results = await comp_algos_bernoulli(
        selectedAlgos,
        10,
        20,
        params,
        3
      );

      const datapoint = results[0].datapoints[0];
      expect(datapoint).toHaveProperty('iteration');
      expect(datapoint).toHaveProperty('optimalPercentage');
      expect(typeof datapoint.iteration).toBe('number');
      expect(typeof datapoint.optimalPercentage).toBe('number');
      expect(datapoint.iteration).toBeGreaterThan(0);
      expect(datapoint.optimalPercentage).toBeGreaterThanOrEqual(0);
      expect(datapoint.optimalPercentage).toBeLessThanOrEqual(100);
    });

    it('should have sequential iteration numbers', async () => {
      const selectedAlgos = [
        { id: 'greedy', label: 'Greedy', show: { value: true } }
      ];
      const params = {};

      const results = await comp_algos_bernoulli(
        selectedAlgos,
        10,
        20,
        params,
        3
      );

      const iterations = results[0].datapoints.map(d => d.iteration);
      expect(iterations).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    });

    it('should restore original bandit parameters after comparison', async () => {
      const banditStore = useBanditStore();
      const originalParams = banditStore.selectedStocks.map(s => s.bernoulli_param);

      const selectedAlgos = [
        { id: 'greedy', label: 'Greedy', show: { value: true } }
      ];
      const params = {};

      await comp_algos_bernoulli(
        selectedAlgos,
        10,
        20,
        params,
        3
      );

      const restoredParams = banditStore.selectedStocks.map(s => s.bernoulli_param);
      expect(restoredParams).toEqual(originalParams);
    });

    it('should reset comparison flags after completion', async () => {
      const algorithmStore = useAlgorithmStore();

      const selectedAlgos = [
        { id: 'greedy', label: 'Greedy', show: { value: true } }
      ];
      const params = {};

      await comp_algos_bernoulli(
        selectedAlgos,
        10,
        20,
        params,
        3
      );

      expect(algorithmStore.algorithmsCompare).toBe(false);
      expect(algorithmStore.optimalActions).toBe(false);
    });
  });

  // ==================== Critical Tests ====================

  describe('Critical Tests - Edge Cases', () => {
    it('should handle single run correctly', async () => {
      const selectedAlgos = [
        { id: 'greedy', label: 'Greedy', show: { value: true } }
      ];
      const params = {};

      const results = await comp_algos_bernoulli(
        selectedAlgos,
        1,   // Single run
        20,
        params,
        3
      );

      expect(results).toHaveLength(1);
      expect(results[0].datapoints).toHaveLength(20);
      // With single run, percentages should be 0 or 100
      results[0].datapoints.forEach(d => {
        expect([0, 100]).toContain(d.optimalPercentage);
      });
    });

    it('should handle single iteration correctly', async () => {
      const selectedAlgos = [
        { id: 'greedy', label: 'Greedy', show: { value: true } }
      ];
      const params = {};

      const results = await comp_algos_bernoulli(
        selectedAlgos,
        10,
        1,   // Single iteration
        params,
        3
      );

      expect(results).toHaveLength(1);
      expect(results[0].datapoints).toHaveLength(1);
      expect(results[0].datapoints[0].iteration).toBe(1);
    });

    it('should handle single arm correctly', async () => {
      const selectedAlgos = [
        { id: 'greedy', label: 'Greedy', show: { value: true } }
      ];
      const params = {};

      const results = await comp_algos_bernoulli(
        selectedAlgos,
        10,
        20,
        params,
        1    // Single arm
      );

      expect(results).toHaveLength(1);
      // With single arm, it's always optimal
      results[0].datapoints.forEach(d => {
        expect(d.optimalPercentage).toBe(100);
      });
    });

    it('should support cancellation', async () => {
      const cancelRef = { value: false };
      const selectedAlgos = [
        { id: 'greedy', label: 'Greedy', show: { value: true } },
        { id: 'thompson', label: 'Thompson', show: { value: true } }
      ];
      const params = {};

      // Cancel immediately
      setTimeout(() => { cancelRef.value = true; }, 10);

      const results = await comp_algos_bernoulli(
        selectedAlgos,
        100,  // Many runs
        100,
        params,
        3,
        cancelRef
      );

      // Should return partial or empty results
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle progress callback', async () => {
      const progressUpdates = [];
      const progressCallback = (status) => {
        progressUpdates.push(status);
      };

      const selectedAlgos = [
        { id: 'greedy', label: 'Greedy', show: { value: true } }
      ];
      const params = {};

      await comp_algos_bernoulli(
        selectedAlgos,
        100,  // Enough runs to trigger progress updates
        20,
        params,
        3,
        undefined,
        progressCallback
      );

      expect(progressUpdates.length).toBeGreaterThan(0);
      const firstUpdate = progressUpdates[0];
      expect(firstUpdate).toHaveProperty('currentAlgorithm');
      expect(firstUpdate).toHaveProperty('currentRun');
      expect(firstUpdate).toHaveProperty('totalRuns');
      expect(firstUpdate).toHaveProperty('percentage');
      expect(firstUpdate.currentAlgorithm).toBe('Greedy');
    });
  });

  // ==================== Performance Tests ====================

  describe('Performance Tests', () => {
    it('should complete moderate workload in reasonable time', async () => {
      const selectedAlgos = [
        { id: 'greedy', label: 'Greedy', show: { value: true } }
      ];
      const params = {};

      const startTime = Date.now();
      
      await comp_algos_bernoulli(
        selectedAlgos,
        50,   // 50 runs
        100,  // 100 iterations
        params,
        5     // 5 arms
      );

      const duration = Date.now() - startTime;
      
      // Should complete in under 5 seconds (with optimizations)
      expect(duration).toBeLessThan(5000);
    }, 10000); // 10 second timeout

    it('should handle multiple parameters efficiently', async () => {
      const selectedAlgos = [
        { id: 'eGreedy', label: 'Epsilon-Greedy', show: { value: true } }
      ];
      const params = {
        eGreedy: [0.01, 0.05, 0.1, 0.15, 0.2] // 5 parameters
      };

      const startTime = Date.now();
      
      const results = await comp_algos_bernoulli(
        selectedAlgos,
        50,
        100,
        params,
        5
      );

      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(5);
      // Should complete in under 10 seconds
      expect(duration).toBeLessThan(10000);
    }, 15000);
  });

  // ==================== Algorithm-Specific Tests ====================

  describe('Algorithm-Specific Tests', () => {
    it('should show greedy converging to suboptimal performance', async () => {
      const selectedAlgos = [
        { id: 'greedy', label: 'Greedy', show: { value: true } }
      ];
      const params = {};

      const results = await comp_algos_bernoulli(
        selectedAlgos,
        100,  // Many runs for statistical significance
        100,
        params,
        3
      );

      // Greedy typically gets stuck around 30-40% optimal actions
      const finalPercentage = results[0].datapoints[results[0].datapoints.length - 1].optimalPercentage;
      expect(finalPercentage).toBeLessThan(70); // Should not reach high performance
    });

    it('should show epsilon-greedy improving with iterations', async () => {
      const selectedAlgos = [
        { id: 'eGreedy', label: 'Epsilon-Greedy', show: { value: true } }
      ];
      const params = {
        eGreedy: [0.1]
      };

      const results = await comp_algos_bernoulli(
        selectedAlgos,
        100,
        100,
        params,
        3
      );

      const datapoints = results[0].datapoints;
      const earlyPercentage = datapoints.slice(0, 10).reduce((sum, d) => sum + d.optimalPercentage, 0) / 10;
      const latePercentage = datapoints.slice(-10).reduce((sum, d) => sum + d.optimalPercentage, 0) / 10;

      // Should improve over time
      expect(latePercentage).toBeGreaterThan(earlyPercentage);
    });

    it('should show different epsilon values affecting performance', async () => {
      const selectedAlgos = [
        { id: 'eGreedy', label: 'Epsilon-Greedy', show: { value: true } }
      ];
      const params = {
        eGreedy: [0.01, 0.1, 0.5] // Low, medium, high exploration
      };

      const results = await comp_algos_bernoulli(
        selectedAlgos,
        100,
        100,
        params,
        3
      );

      expect(results).toHaveLength(3);
      
      // All should converge, but at different rates
      results.forEach(result => {
        const finalPercentage = result.datapoints[result.datapoints.length - 1].optimalPercentage;
        expect(finalPercentage).toBeGreaterThan(0);
        expect(finalPercentage).toBeLessThanOrEqual(100);
      });
    });
  });
});
