import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { greedy_bernoulli, greedy_gaussian, init_array_arms } from '../algorithms/greedy.js';

// Mock-Module vor dem Import, damit die Mocks korrekt funktionieren
vi.mock('../bandits/bernoulli.js', () => ({
    bernoulli: vi.fn()
}));

vi.mock('../bandits/gaussian.js', () => ({
    gaussian: vi.fn()
}));

// Jetzt importieren wir die gemockten Module
import * as bernoulliModule from '../bandits/bernoulli.js';
import * as gaussianModule from '../bandits/gaussian.js';

describe('Greedy Algorithm Tests', () => {
    // Setup mocks before each test - can be delete if real bandits are implemented
    beforeEach(() => {
        // Zurücksetzen der Mocks vor jedem Test
        vi.resetAllMocks();
    });

    // Restore all mocks after each test
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Tests für init_array_arms
    describe('init_array_arms', () => {
        it('should initialize array with correct structure', () => {
            // Arrange
            const arms = [
                { name: "Arm1", propability: 0.6 },
                { name: "Arm2", propability: 0.2 }
            ];
            
            // Act
            const result = init_array_arms(arms);
            
            // Assert
            expect(result).toHaveLength(2);
            expect(result[0]).toHaveProperty('name', 'Arm1');
            expect(result[0]).toHaveProperty('trial_result');
            expect(result[0].trial_result).toEqual([]);
            expect(result[0]).toHaveProperty('bandit_result', 0);
            expect(result[1]).toHaveProperty('name', 'Arm2');
        });
        
        it('should handle empty array', () => {
            // Arrange
            const arms = [];
            
            // Act
            const result = init_array_arms(arms);
            
            // Assert
            expect(result).toHaveLength(0);
            expect(result).toEqual([]);
        });
        
        it('should handle arrays with different properties', () => {
            // Arrange
            const arms = [
                { name: "Arm1", propability: 0.6 },
                { name: "Arm2", mean: 0.5, variance: 0.1 },
                { name: "Arm3", someOtherProp: "value" }
            ];
            
            // Act
            const result = init_array_arms(arms);
            
            // Assert
            expect(result).toHaveLength(3);
            expect(result[0]).toHaveProperty('name', 'Arm1');
            expect(result[1]).toHaveProperty('name', 'Arm2');
            expect(result[2]).toHaveProperty('name', 'Arm3');
            // Check that all arms have the same structure
            result.forEach(arm => {
                expect(arm).toHaveProperty('trial_result');
                expect(arm.trial_result).toEqual([]);
                expect(arm).toHaveProperty('bandit_result', 0);
            });
        });
        
        it('should not modify the original arms array', () => {
            // Arrange
            const arms = [
                { name: "Arm1", propability: 0.6 },
                { name: "Arm2", propability: 0.2 }
            ];
            const originalArms = JSON.parse(JSON.stringify(arms));
            
            // Act
            init_array_arms(arms);
            
            // Assert
            expect(arms).toEqual(originalArms);
        });
    });

    // Tests für greedy_bernoulli
    describe('greedy_bernoulli', () => {
        it('should call greedy function with correct parameters', () => {
            // Arrange
            const arms = [
                { name: "Arm1", propability: 0.6 },
                { name: "Arm2", propability: 0.2 }
            ];
            const trials = 5;
            
            // Mock bernoulli to always return true
            bernoulliModule.bernoulli.mockReturnValue(true);
            
            // Act
            const result = greedy_bernoulli(arms, trials);
            
            // Assert
            expect(result).toHaveLength(2);
            expect(bernoulliModule.bernoulli).toHaveBeenCalledTimes(trials);
            expect(bernoulliModule.bernoulli).toHaveBeenCalledWith(arms[0].propability);
        });
        
        it('should handle different probabilities correctly', () => {
            // Arrange
            const arms = [
                { name: "Arm1", propability: 0.8 },
                { name: "Arm2", propability: 0.2 }
            ];
            const trials = 3;
            
            // Mock bernoulli to return true for first arm, false for second arm
            bernoulliModule.bernoulli.mockImplementation((propability) => {
                return propability === 0.8;
            });
            
            // Act
            const result = greedy_bernoulli(arms, trials);
            
            // Assert
            expect(result[0].bandit_result).toBe(1); // 100% success rate
            expect(result[0].trial_result).toEqual([true, true, true]);
        });
        
        it('should fail if greedy function changes and greedy_bernoulli is not updated', () => {
            // This test is designed to fail if the greedy function's signature changes
            // and greedy_bernoulli is not updated accordingly
            
            // Arrange
            const arms = [
                { name: "Arm1", propability: 0.6 }
            ];
            const trials = 1;
            
            // Act & Assert
            const result = greedy_bernoulli(arms, trials);
            
            // Verify the function returned a result (would fail if signature changed)
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            
            // Verify bernoulli was called with the correct parameter
            expect(bernoulliModule.bernoulli).toHaveBeenCalledWith(arms[0].propability);
        });
        
        it('should calculate bandit_result correctly for bernoulli', () => {
            // Arrange
            const arms = [
                { name: "Arm1", propability: 0.6 }
            ];
            const trials = 4;
            
            // Mock bernoulli to return alternating values
            bernoulliModule.bernoulli
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(false);
            
            // Act
            const result = greedy_bernoulli(arms, trials);
            
            // Assert
            expect(result[0].trial_result).toEqual([true, false, true, false]);
            expect(result[0].bandit_result).toBe(0.5); // 2 successes out of 4 trials
        });
    });

    // Tests für greedy_gaussian
    describe('greedy_gaussian', () => {
        it('should call greedy function with correct parameters', () => {
            // Arrange
            const arms = [
                { name: "Arm1", mean: 0.6, variance: 0.1 },
                { name: "Arm2", mean: 0.2, variance: 0.2 }
            ];
            const trials = 5;
            
            // Mock gaussian to return a fixed value
            gaussianModule.gaussian.mockReturnValue(0.5);
            
            // Act
            const result = greedy_gaussian(arms, trials);
            
            // Assert
            expect(result).toHaveLength(2);
            expect(gaussianModule.gaussian).toHaveBeenCalledTimes(trials);
            expect(gaussianModule.gaussian).toHaveBeenCalledWith(arms[0].mean, arms[0].variance);
        });
        
        it('should handle different means and variances correctly', () => {
            // Arrange
            const arms = [
                { name: "Arm1", mean: 0.8, variance: 0.1 },
                { name: "Arm2", mean: 0.2, variance: 0.2 }
            ];
            const trials = 3;
            
            // Mock gaussian to return the mean value
            gaussianModule.gaussian.mockImplementation((mean, variance) => {
                return mean;
            });
            
            // Act
            const result = greedy_gaussian(arms, trials);
            
            // Assert
            expect(result[0].bandit_result).toBeCloseTo(0.8, 10); // Mean value
            expect(result[0].trial_result).toEqual([0.8, 0.8, 0.8]);
        });
        
        it('should fail if greedy function changes and greedy_gaussian is not updated', () => {
            // This test is designed to fail if the greedy function's signature changes
            // and greedy_gaussian is not updated accordingly
            
            // Arrange
            const arms = [
                { name: "Arm1", mean: 0.6, variance: 0.1 }
            ];
            const trials = 1;
            
            // Act & Assert
            const result = greedy_gaussian(arms, trials);
            
            // Verify the function returned a result (would fail if signature changed)
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            
            // Verify gaussian was called with the correct parameters
            expect(gaussianModule.gaussian).toHaveBeenCalledWith(arms[0].mean, arms[0].variance);
        });
        
        it('should calculate bandit_result correctly for gaussian', () => {
            // Arrange
            const arms = [
                { name: "Arm1", mean: 0.6, variance: 0.1 }
            ];
            const trials = 4;
            
            // Mock gaussian to return specific values
            gaussianModule.gaussian
                .mockReturnValueOnce(0.5)
                .mockReturnValueOnce(0.7)
                .mockReturnValueOnce(0.6)
                .mockReturnValueOnce(0.8);
            
            // Act
            const result = greedy_gaussian(arms, trials);
            
            // Assert
            expect(result[0].trial_result).toEqual([0.5, 0.7, 0.6, 0.8]);
            expect(result[0].bandit_result).toBeCloseTo(0.65, 10); // Average of values
        });
    });

    // Tests für die greedy Implementierung selbst
    describe('greedy implementation', () => {
        // Test für die äußere for-Schleife: Prüfen, ob alle Trials korrekt ausgeführt werden
        it('should execute exactly the specified number of trials', () => {
            // Arrange
            const arms = [
                { name: "Arm1", propability: 0.6 },
                { name: "Arm2", propability: 0.7 }
            ];
            const trials = 42; // Eine spezifische Anzahl an Trials
            
            // Mock bernoulli, um die Anzahl der Aufrufe zu zählen
            bernoulliModule.bernoulli.mockReturnValue(true);
            
            // Act
            const result = greedy_bernoulli(arms, trials);
            
            // Assert
            // Prüfen, ob bernoulli genau trials-mal aufgerufen wurde
            expect(bernoulliModule.bernoulli).toHaveBeenCalledTimes(trials);
            
            // Prüfen, ob die Summe aller trial_result.length genau trials ist
            const totalTrials = result.reduce((sum, arm) => sum + arm.trial_result.length, 0);
            expect(totalTrials).toBe(trials);
        });
        
        // Test für die innere for-Schleife: Prüfen, ob der korrekte Arm ausgewählt wird
        it('should select the arm with the best bandit_result', () => {
            // Arrange
            const arms = [
                { name: "LowProbArm", propability: 0.1 },
                { name: "HighProbArm", propability: 0.9 }
            ];
            const trials = 10;
            
            // Wir initialisieren die Arms mit vordefinierten bandit_results
            // durch Manipulation der Mock-Implementierung
            let callCount = 0;
            bernoulliModule.bernoulli.mockImplementation(() => {
                callCount++;
                if (callCount <= 2) {
                    // Erste zwei Aufrufe: Arm initialisieren
                    return callCount === 1;  // Arm 0: true (1.0), Arm 1: false (0.0)
                } else {
                    // Danach sollte immer der erste Arm gewählt werden
                    return true;
                }
            });
            
            // Act
            const result = greedy_bernoulli(arms, trials);
            
            // Assert
            // Der erste Arm sollte nach der Initialisierung die meisten Trials haben
            expect(result[0].trial_result.length).toBeGreaterThan(result[1].trial_result.length);
            expect(result[0].bandit_result).toBeGreaterThan(0);
        });
        
        // Test für den Switch-Case: Prüfen, ob der korrekte Bandit aufgerufen wird
        it('should call the correct bandit function based on bandit parameter', () => {
            // Arrange
            const bernoulliArms = [{ name: "BernoulliArm", propability: 0.5 }];
            const gaussianArms = [{ name: "GaussianArm", mean: 0.5, variance: 0.1 }];
            const trials = 5;
            
            // Mocks für beide Bandit-Funktionen
            bernoulliModule.bernoulli.mockReturnValue(true);
            gaussianModule.gaussian.mockReturnValue(0.5);
            
            // Act - Teil 1: Teste bernoulli
            greedy_bernoulli(bernoulliArms, trials);
            
            // Assert - Teil 1
            expect(bernoulliModule.bernoulli).toHaveBeenCalledTimes(trials);
            expect(gaussianModule.gaussian).not.toHaveBeenCalled();
            
            // Zurücksetzen der Mocks für Teil 2
            vi.clearAllMocks();
            
            // Act - Teil 2: Teste gaussian
            greedy_gaussian(gaussianArms, trials);
            
            // Assert - Teil 2
            expect(gaussianModule.gaussian).toHaveBeenCalledTimes(trials);
            expect(bernoulliModule.bernoulli).not.toHaveBeenCalled();
        });
        
        // Test für die korrekte Berechnung von bandit_result
        it('should calculate bandit_result correctly for both bandit types', () => {
            // Arrange
            const bernoulliArm = { name: "BernoulliArm", propability: 0.5 };
            const gaussianArm = { name: "GaussianArm", mean: 0.5, variance: 0.1 };
            const trials = 3;
            
            // Mock für Bernoulli: [true, false, true]
            bernoulliModule.bernoulli
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true);
            
            // Mock für Gaussian: [0.4, 0.5, 0.6]
            gaussianModule.gaussian
                .mockReturnValueOnce(0.4)
                .mockReturnValueOnce(0.5)
                .mockReturnValueOnce(0.6);
            
            // Act
            const bernoulliResult = greedy_bernoulli([bernoulliArm], trials);
            
            // Zurücksetzen der Mocks
            vi.clearAllMocks();
            
            const gaussianResult = greedy_gaussian([gaussianArm], trials);
            
            // Assert
            // Bernoulli: 2 von 3 true = 2/3 ≈ 0.6667
            expect(bernoulliResult[0].bandit_result).toBeCloseTo(2/3, 4);
            
            // Gaussian: Durchschnitt von [0.4, 0.5, 0.6] = 0.5
            expect(gaussianResult[0].bandit_result).toBe(0.5);
        });
        
        // Detaillierter Test für die Berechnungsformeln in der Switch-Anweisung
        it('should correctly implement the bandit_result calculation formulas', () => {
            // Arrange - Komplexere Testfälle für beide Banditentypen
            const bernoulliArm = { name: "ComplexBernoulliArm", propability: 0.5 };
            const gaussianArm = { name: "ComplexGaussianArm", mean: 0.5, variance: 0.1 };
            const trials = 5;
            
            // Bernoulli mit verschiedenen Werten: [true, false, true, true, false]
            bernoulliModule.bernoulli
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(false);
            
            // Act - Bernoulli
            const bernoulliResult = greedy_bernoulli([bernoulliArm], trials);
            
            // Assert - Bernoulli: Erwartung ist 3/5 = 0.6
            expect(bernoulliResult[0].trial_result).toEqual([true, false, true, true, false]);
            
            // Manuell die Formel nachrechnen und mit dem Ergebnis vergleichen
            const manualBernoulliCalculation = bernoulliResult[0].trial_result.reduce(
                (sum, result) => sum + (result ? 1 : 0), 0
            ) / bernoulliResult[0].trial_result.length;
            
            expect(bernoulliResult[0].bandit_result).toBe(manualBernoulliCalculation);
            expect(bernoulliResult[0].bandit_result).toBeCloseTo(0.6, 10);
            
            // Zurücksetzen der Mocks
            vi.clearAllMocks();
            
            // Gaussian mit verschiedenen Werten: [0.1, 0.3, 0.5, 0.7, 0.9]
            gaussianModule.gaussian
                .mockReturnValueOnce(0.1)
                .mockReturnValueOnce(0.3)
                .mockReturnValueOnce(0.5)
                .mockReturnValueOnce(0.7)
                .mockReturnValueOnce(0.9);
            
            // Act - Gaussian
            const gaussianResult = greedy_gaussian([gaussianArm], trials);
            
            // Assert - Gaussian: Erwartung ist (0.1 + 0.3 + 0.5 + 0.7 + 0.9) / 5 = 0.5
            expect(gaussianResult[0].trial_result).toEqual([0.1, 0.3, 0.5, 0.7, 0.9]);
            
            // Manuell die Formel nachrechnen und mit dem Ergebnis vergleichen
            const manualGaussianCalculation = gaussianResult[0].trial_result.reduce(
                (sum, result) => sum + result, 0
            ) / gaussianResult[0].trial_result.length;
            
            expect(gaussianResult[0].bandit_result).toBe(manualGaussianCalculation);
            expect(gaussianResult[0].bandit_result).toBeCloseTo(0.5, 10);
        });

        // Test für den korrekten Aufruf der Bandit-Funktionen mit Parametern
        it('should call bernoulli with the correct probability parameter', () => {
            // Arrange
            const arms = [
                { name: "Arm1", propability: 0.6 },
                { name: "Arm2", propability: 0.8 }
            ];
            const trials = 2;
            
            // Mock für vorhersehbares Verhalten
            bernoulliModule.bernoulli.mockReturnValue(true);
            
            // Act
            greedy_bernoulli(arms, trials);
            
            // Assert
            // Da immer der Arm mit dem besten Ergebnis gewählt wird, wird immer der erste Arm gewählt
            // (da alle true zurückgeben, aber der erste zuerst initialisiert wird)
            expect(bernoulliModule.bernoulli).toHaveBeenCalledWith(arms[0].propability);
            expect(bernoulliModule.bernoulli).toHaveBeenCalledTimes(trials);
        });
        
        it('should call gaussian with the correct mean and variance parameters', () => {
            // Arrange
            const arms = [
                { name: "Arm1", mean: 0.6, variance: 0.1 },
                { name: "Arm2", mean: 0.8, variance: 0.2 }
            ];
            const trials = 2;
            
            // Mock für vorhersehbares Verhalten
            gaussianModule.gaussian.mockReturnValue(0.5);
            
            // Act
            greedy_gaussian(arms, trials);
            
            // Assert
            // Da immer der Arm mit dem besten Ergebnis gewählt wird, wird immer der erste Arm gewählt
            // (da alle 0.5 zurückgeben, aber der erste zuerst initialisiert wird)
            expect(gaussianModule.gaussian).toHaveBeenCalledWith(arms[0].mean, arms[0].variance);
            expect(gaussianModule.gaussian).toHaveBeenCalledTimes(trials);
        });
        
        // Test für die korrekte Aktualisierung der trial_result-Arrays
        it('should append results to trial_result arrays correctly', () => {
            // Arrange
            const arms = [
                { name: "TestArm", propability: 0.5 }
            ];
            const trials = 3;
            
            // Vordefinierte Rückgabewerte
            bernoulliModule.bernoulli
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true);
            
            // Act
            const result = greedy_bernoulli(arms, trials);
            
            // Assert
            expect(result[0].trial_result).toEqual([true, false, true]);
            expect(result[0].trial_result.length).toBe(trials);
        });
    });
});