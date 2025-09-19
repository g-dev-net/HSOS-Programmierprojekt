import { describe, it, expect } from 'vitest';
import { init_array_arms } from './greedy.js';


describe('Greedy Algorithm Tests', () => {
    describe('init_array_arms', () => {
    it('should initialize an array with the correct structure for each arm', () => {
      // Arrange
      const testArms = [
        { name: "TestArm1" },
        { name: "TestArm2" }
      ];

      // Act
      const result = init_array_arms(testArms);

      // Assert
      expect(result).toHaveLength(2);
      
      // Check first arm
      expect(result[0].name).toBe("TestArm1");
      expect(result[0].trial_result).toEqual([]);
      expect(result[0].bandit_result).toBe(0);

      // Check second arm
      expect(result[1].name).toBe("TestArm2");
      expect(result[1].trial_result).toEqual([]);
      expect(result[1].bandit_result).toBe(0);
    });

    it('should handle an empty array', () => {
      // Arrange
      const emptyArms = [];

      // Act
      const result = init_array_arms(emptyArms);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle arms with missing properties', () => {
      // Arrange
      const incompleteArms = [
        { name: "IncompleteArm" }
      ];

      // Act
      const result = init_array_arms(incompleteArms);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("IncompleteArm");
      expect(result[0].trial_result).toEqual([]);
      expect(result[0].bandit_result).toBe(0);
    });

    // Not really neccessary bc titles are defined by system and no user input
    it('should handle mistakes in arm definitions', () => {
      // Arrange
      const faultyArms = [
        { title: "FaultyArm" },
        { title: 123 },
        { title: null },
        { title: "§%&/" }
      ];

      // Act
      const result = init_array_arms(faultyArms);

      // Assert
      expect(result).toHaveLength(4);
      expect(result[0].name).toBeUndefined();
      expect(result[0].trial_result).toEqual([]);
      expect(result[0].bandit_result).toBe(0);
    });
  });
});