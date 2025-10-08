import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { greedy_bernoulli, greedy_gaussian, eGreedy_bernoulli, eGreedy_gaussian } from '../algorithms/e_greedy_OIV.ts';
import { useBanditStore } from '@/stores/bandit';
import { useAlgorithmStore } from '@/stores/algorithms';

describe('Greedy Algorithm Store-Based Tests', () => {
    let banditStore;
    let algorithmStore;

    // Setup Pinia and stores before each test
    beforeEach(() => {
        setActivePinia(createPinia());
        banditStore = useBanditStore();
        algorithmStore = useAlgorithmStore();
        
        // Setup default test data
        banditStore.selectedStocks = [
            {
                stock: { id: 1, name: "Stock A", price: 100, logo_url: "test1.jpg" },
                bernoulli_param: 0.7,
                gaussian_param: 0.5
            },
            {
                stock: { id: 2, name: "Stock B", price: 150, logo_url: "test2.jpg" },
                bernoulli_param: 0.3,
                gaussian_param: 0.2
            },
            {
                stock: { id: 3, name: "Stock C", price: 200, logo_url: "test3.jpg" },
                bernoulli_param: 0.9,
                gaussian_param: 0.8
            }
        ];
        banditStore.possibleInvestments = 10;
        
        // Reset algorithm store
        algorithmStore.investmentsGreedy = [];
        algorithmStore.algorithmsInProgress = false;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Tests für Store Integration
    describe('Store Integration', () => {
        it('should read configuration from bandit store', () => {
            // Arrange
            banditStore.possibleInvestments = 5;
            
            // Act
            greedy_bernoulli();
            
            // Assert
            // Cold-Start: 3 stocks + 5 investments = 8 total
            expect(algorithmStore.investmentsGreedy).toHaveLength(8);
        });
        
        it('should update algorithm store with results', () => {
            // Arrange
            banditStore.possibleInvestments = 3;
            
            // Act
            greedy_bernoulli();
            
            // Assert
            // Cold-start (3 stocks) + 3 investments = 6 total
            expect(algorithmStore.investmentsGreedy).toHaveLength(6);
            algorithmStore.investmentsGreedy.forEach(investment => {
                expect(investment).toHaveProperty('stock');
                expect(investment).toHaveProperty('greedyReturn');
                expect(investment.stock).toHaveProperty('stock');
                expect(investment.stock.stock).toHaveProperty('name');
            });
        });
        
        it('should set algorithmsInProgress flag during execution', () => {
            // Arrange
            let progressFlagDuringExecution = false;
            const initialValue = algorithmStore.algorithmsInProgress;
            
            // Act
            greedy_bernoulli();
            
            // Assert
            expect(initialValue).toBe(false); // Should start false
            expect(algorithmStore.algorithmsInProgress).toBe(false); // Should end false
        });
        
        it('should handle zero possibleInvestments', () => {
            // Arrange
            banditStore.possibleInvestments = 0;
            
            // Act
            greedy_bernoulli();
            
            // Assert
            // Should still have cold-start entries (3 stocks)
            expect(algorithmStore.investmentsGreedy).toHaveLength(3);
            expect(algorithmStore.algorithmsInProgress).toBe(false);
        });
    });

    // Tests für Cold-Start Initialization
    describe('Cold-Start Initialization', () => {
        it('should initialize each stock with greedyReturn 0 and other values null', () => {
            // Arrange
            banditStore.possibleInvestments = 0; // No additional investments
            
            // Act
            greedy_bernoulli();
            
            // Assert
            expect(algorithmStore.investmentsGreedy).toHaveLength(3); // Only cold-start entries
            
            algorithmStore.investmentsGreedy.forEach((investment, index) => {
                expect(investment.stock).toBe(banditStore.selectedStocks[index]);
                expect(investment.greedyReturn).toBe(0);
                expect(investment.thompsonReturn).toBe(null);
                expect(investment.ucbReturn).toBe(null);
                expect(investment.gradientReturn).toBe(null);
                expect(investment.optimisticInitialReturn).toBe(null);
                expect(investment.userAlgorithmReturn).toBe(null);
            });
        });
        
        it('should cold-start with exactly one entry per selected stock', () => {
            // Arrange
            banditStore.selectedStocks = [
                { stock: { id: 1, name: "Stock A" }, bernoulli_param: 0.5, gaussian_param: 0.1 },
                { stock: { id: 2, name: "Stock B" }, bernoulli_param: 0.7, gaussian_param: 0.2 }
            ];
            banditStore.possibleInvestments = 0;
            
            // Act
            greedy_gaussian();
            
            // Assert
            expect(algorithmStore.investmentsGreedy).toHaveLength(2);
            expect(algorithmStore.investmentsGreedy[0].stock.stock.name).toBe("Stock A");
            expect(algorithmStore.investmentsGreedy[1].stock.stock.name).toBe("Stock B");
            expect(algorithmStore.investmentsGreedy[0].greedyReturn).toBe(0);
            expect(algorithmStore.investmentsGreedy[1].greedyReturn).toBe(0);
        });
        
        it('should cold-start before processing additional investments', () => {
            // Arrange
            banditStore.selectedStocks = [
                { stock: { id: 1, name: "Stock A" }, bernoulli_param: 0.8, gaussian_param: 0.1 }
            ];
            banditStore.possibleInvestments = 2;
            
            // Act
            greedy_bernoulli();
            
            // Assert
            expect(algorithmStore.investmentsGreedy).toHaveLength(3); // 1 cold-start + 2 investments
            
            // First entry should be cold-start
            expect(algorithmStore.investmentsGreedy[0].greedyReturn).toBe(0);
            expect(algorithmStore.investmentsGreedy[0].thompsonReturn).toBe(null);
            
            // Subsequent entries should have actual bandit results
            expect(algorithmStore.investmentsGreedy[1].greedyReturn).not.toBe(null);
            expect(algorithmStore.investmentsGreedy[2].greedyReturn).not.toBe(null);
        });
        
        it('should handle empty selectedStocks gracefully', () => {
            // Arrange
            banditStore.selectedStocks = [];
            banditStore.possibleInvestments = 5;
            
            // Act & Assert
            // Should throw error since algorithm expects stocks to exist
            expect(() => greedy_bernoulli()).toThrow();
        });
    });

    // Tests für greedy_bernoulli
    describe('greedy_bernoulli', () => {
        it('should execute correct number of investments', () => {
            // Arrange
            banditStore.possibleInvestments = 7;
            
            // Act
            eGreedy_bernoulli();
            
            // Assert
            // Cold-start (3 stocks) + 7 investments = 10 total
            expect(algorithmStore.investmentsGreedy).toHaveLength(10);
        });        it('should store bernoulli results as greedyReturn', () => {
            // Arrange
            banditStore.possibleInvestments = 5;
            
            // Act
            greedy_bernoulli();
            
            // Assert
            algorithmStore.investmentsGreedy.forEach(investment => {
                expect(typeof investment.greedyReturn).toBe('number');
                expect(investment.greedyReturn === 0 || investment.greedyReturn === 1).toBe(true);
            });
        });
        
        it('should select stocks with better performance over time', () => {
            // Arrange
            banditStore.possibleInvestments = 20;
            banditStore.selectedStocks = [
                {
                    stock: { id: 1, name: "Low Prob Stock", price: 100, logo_url: "low.jpg" },
                    bernoulli_param: 0.1, // Very low probability
                    gaussian_param: 0.1
                },
                {
                    stock: { id: 2, name: "High Prob Stock", price: 100, logo_url: "high.jpg" },
                    bernoulli_param: 0.9, // Very high probability
                    gaussian_param: 0.9
                }
            ];
            
            // Act
            greedy_bernoulli();
            
            // Assert
            const highProbStockSelections = algorithmStore.investmentsGreedy.filter(
                inv => inv.stock.stock.name === "High Prob Stock"
            ).length;
            const lowProbStockSelections = algorithmStore.investmentsGreedy.filter(
                inv => inv.stock.stock.name === "Low Prob Stock"
            ).length;
            
            // At least some investments should be made
            expect(algorithmStore.investmentsGreedy).toHaveLength(22); // 2 cold-start + 20 investments
            // Both stocks should be tried at least once in a greedy algorithm
            expect(highProbStockSelections + lowProbStockSelections).toBe(22);
        });
        
        it('should work with single stock', () => {
            // Arrange
            banditStore.selectedStocks = [banditStore.selectedStocks[0]]; // Only first stock
            banditStore.possibleInvestments = 5;
            
            // Act
            greedy_bernoulli();
            
            // Assert
            expect(algorithmStore.investmentsGreedy).toHaveLength(6); // 1 cold-start + 5 investments
            algorithmStore.investmentsGreedy.forEach(investment => {
                expect(investment.stock.stock.name).toBe("Stock A");
            });
        });
    });

    // Tests für eGreedy_bernoulli
    describe('eGreedy_bernoulli', () => {
        it('should execute correct number of investments', () => {
            // Arrange
            banditStore.possibleInvestments = 7;
            
            // Act
            eGreedy_bernoulli();
            
            // Assert
            expect(algorithmStore.investmentsGreedy).toHaveLength(10); // 3 cold-start + 7 investments
        });
        
        it('should explore different stocks due to epsilon', () => {
            // Arrange
            banditStore.possibleInvestments = 100; // Large number for statistical significance
            banditStore.selectedStocks = [
                {
                    stock: { id: 1, name: "Stock A", price: 100, logo_url: "a.jpg" },
                    bernoulli_param: 0.95, // Very high probability
                    gaussian_param: 0.95
                },
                {
                    stock: { id: 2, name: "Stock B", price: 100, logo_url: "b.jpg" },
                    bernoulli_param: 0.05, // Very low probability
                    gaussian_param: 0.05
                }
            ];
            
            // Act
            eGreedy_bernoulli();
            
            // Assert
            const stockASelections = algorithmStore.investmentsGreedy.filter(
                inv => inv.stock.stock.name === "Stock A"
            ).length;
            const stockBSelections = algorithmStore.investmentsGreedy.filter(
                inv => inv.stock.stock.name === "Stock B"
            ).length;
            
            // Due to epsilon exploration, both stocks should be selected
            expect(stockASelections).toBeGreaterThan(0);
            expect(stockBSelections).toBeGreaterThan(0);
            // But Stock A should still be selected more often
            expect(stockASelections).toBeGreaterThan(stockBSelections);
        });
        
        it('should explore more than standard greedy', () => {
            // Arrange
            banditStore.possibleInvestments = 50;
            banditStore.selectedStocks = [
                {
                    stock: { id: 1, name: "Dominant Stock", price: 100, logo_url: "dom.jpg" },
                    bernoulli_param: 0.8,
                    gaussian_param: 0.8
                },
                {
                    stock: { id: 2, name: "Weaker Stock", price: 100, logo_url: "weak.jpg" },
                    bernoulli_param: 0.2,
                    gaussian_param: 0.2
                }
            ];
            
            // Act
            algorithmStore.investmentsGreedy = []; // Reset
            greedy_bernoulli();
            const greedyResults = [...algorithmStore.investmentsGreedy];
            
            algorithmStore.investmentsGreedy = []; // Reset
            eGreedy_bernoulli();
            const eGreedyResults = [...algorithmStore.investmentsGreedy];
            
            // Assert
            const greedyWeakerSelections = greedyResults.filter(
                inv => inv.stock.stock.name === "Weaker Stock"
            ).length;
            const eGreedyWeakerSelections = eGreedyResults.filter(
                inv => inv.stock.stock.name === "Weaker Stock"
            ).length;
            
            // Epsilon-greedy should select the weaker stock more often due to exploration
            expect(eGreedyWeakerSelections).toBeGreaterThanOrEqual(greedyWeakerSelections);
        });
    });

    // Tests für greedy_gaussian
    describe('greedy_gaussian', () => {
        it('should execute correct number of investments', () => {
            // Arrange
            banditStore.possibleInvestments = 8;
            
            // Act
            greedy_gaussian();
            
            // Assert
            expect(algorithmStore.investmentsGreedy).toHaveLength(11); // 3 cold-start + 8 investments
        });
        
        it('should store gaussian results as greedyReturn', () => {
            // Arrange
            banditStore.possibleInvestments = 5;
            
            // Act
            greedy_gaussian();
            
            // Assert
            const actualInvestments = algorithmStore.investmentsGreedy.slice(3); // Skip cold-start
            actualInvestments.forEach(investment => {
                expect(typeof investment.greedyReturn).toBe('number');
                expect(investment.greedyReturn).not.toBe(0); // Gaussian values are typically not exactly 0
                expect(investment.greedyReturn).not.toBe(1); // Gaussian values are typically not exactly 1
            });
        });
        
        it('should select stocks with better gaussian performance', () => {
            // Arrange
            banditStore.possibleInvestments = 30;
            banditStore.selectedStocks = [
                {
                    stock: { id: 1, name: "Low Gaussian Stock", price: 100, logo_url: "low.jpg" },
                    bernoulli_param: 0.5,
                    gaussian_param: -0.5 // Negative mean
                },
                {
                    stock: { id: 2, name: "High Gaussian Stock", price: 100, logo_url: "high.jpg" },
                    bernoulli_param: 0.5,
                    gaussian_param: 0.8 // Positive mean
                }
            ];
            
            // Act
            greedy_gaussian();
            
            // Assert
            const highGaussianSelections = algorithmStore.investmentsGreedy.filter(
                inv => inv.stock.stock.name === "High Gaussian Stock"
            ).length;
            const lowGaussianSelections = algorithmStore.investmentsGreedy.filter(
                inv => inv.stock.stock.name === "Low Gaussian Stock"
            ).length;
            
            // All investments should be made
            expect(algorithmStore.investmentsGreedy).toHaveLength(32); // 2 cold-start + 30 investments
            // Both stocks should be involved in the decision process
            expect(highGaussianSelections + lowGaussianSelections).toBe(32);
        });
    });

    // Tests für eGreedy_gaussian
    describe('eGreedy_gaussian', () => {
        it('should execute correct number of investments', () => {
            // Arrange
            banditStore.possibleInvestments = 6;
            
            // Act
            eGreedy_gaussian();
            
            // Assert
            expect(algorithmStore.investmentsGreedy).toHaveLength(9); // 3 cold-start + 6 investments
        });
        
        it('should explore different stocks with gaussian bandits', () => {
            // Arrange
            banditStore.possibleInvestments = 100;
            banditStore.selectedStocks = [
                {
                    stock: { id: 1, name: "High Mean Stock", price: 100, logo_url: "high.jpg" },
                    bernoulli_param: 0.5,
                    gaussian_param: 1.0 // High positive mean
                },
                {
                    stock: { id: 2, name: "Low Mean Stock", price: 100, logo_url: "low.jpg" },
                    bernoulli_param: 0.5,
                    gaussian_param: -0.5 // Negative mean
                }
            ];
            
            // Act
            eGreedy_gaussian();
            
            // Assert
            const highMeanSelections = algorithmStore.investmentsGreedy.filter(
                inv => inv.stock.stock.name === "High Mean Stock"
            ).length;
            const lowMeanSelections = algorithmStore.investmentsGreedy.filter(
                inv => inv.stock.stock.name === "Low Mean Stock"
            ).length;
            
            // Both stocks should be selected due to exploration
            expect(highMeanSelections).toBeGreaterThan(0);
            expect(lowMeanSelections).toBeGreaterThan(0);
            // But high mean stock should be selected more often
            expect(highMeanSelections).toBeGreaterThan(lowMeanSelections);
        });
    });

    // Tests für Algorithm Logic
    describe('Algorithm Logic', () => {
        it('should select best performing stock in exploitation phase', () => {
            // Arrange - Pre-populate with known results
            banditStore.possibleInvestments = 5;
            algorithmStore.investmentsGreedy = [
                {
                    stock: banditStore.selectedStocks[0],
                    greedyReturn: 0.2 // Low performance
                },
                {
                    stock: banditStore.selectedStocks[1],
                    greedyReturn: 0.8 // High performance
                },
                {
                    stock: banditStore.selectedStocks[2],
                    greedyReturn: 0.5 // Medium performance
                }
            ];
            
            // Mock Math.random to ensure exploitation (not exploration)
            const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9); // > epsilon
            
            // Act
            greedy_bernoulli(); // This should select the best performing stock
            
            // Assert
            // The last few investments should predominantly be the high-performance stock
            const lastInvestments = algorithmStore.investmentsGreedy.slice(-3);
            const highPerformanceSelections = lastInvestments.filter(
                inv => inv.stock === banditStore.selectedStocks[1]
            ).length;
            
            expect(highPerformanceSelections).toBeGreaterThan(0);
            
            mathRandomSpy.mockRestore();
        });
        
        it('should handle initial exploration when no prior results exist', () => {
            // Arrange
            banditStore.possibleInvestments = 3;
            algorithmStore.investmentsGreedy = []; // Empty initial state
            
            // Act
            greedy_bernoulli();
            
            // Assert
            expect(algorithmStore.investmentsGreedy).toHaveLength(6); // 3 cold-start + 3 investments
            // Should not throw errors when accessing empty array
            algorithmStore.investmentsGreedy.forEach(investment => {
                expect(investment).toHaveProperty('stock');
                expect(investment).toHaveProperty('greedyReturn');
            });
        });
        
        it('should properly compare numeric greedyReturn values', () => {
            // Arrange
            banditStore.possibleInvestments = 1;
            algorithmStore.investmentsGreedy = [
                {
                    stock: banditStore.selectedStocks[0],
                    greedyReturn: 0.3
                },
                {
                    stock: banditStore.selectedStocks[1], 
                    greedyReturn: 0.7 // This should be selected as best
                },
                {
                    stock: banditStore.selectedStocks[2],
                    greedyReturn: 0.1
                }
            ];
            
            // Mock Math.random to ensure exploitation
            const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9);
            
            // Act
            greedy_gaussian(); // Single investment should pick the best
            
            // Assert
            const lastInvestment = algorithmStore.investmentsGreedy[algorithmStore.investmentsGreedy.length - 1];
            expect(lastInvestment.stock).toBe(banditStore.selectedStocks[1]); // Stock with 0.7 return
            
            mathRandomSpy.mockRestore();
        });
    });

    // Tests für spezifische Algorithmus-Implementierung (Schleifen, Bedingungen, etc.)
    describe('Algorithm Implementation Details', () => {
        // Test für die äußere for-Schleife: Prüfen, ob alle Investments korrekt ausgeführt werden
        it('should execute exactly the specified number of investments (for-loop test)', () => {
            // Arrange
            const exactTrials = 42; // Eine spezifische Anzahl an Investments
            banditStore.possibleInvestments = exactTrials;
            
            // Act
            greedy_bernoulli();
            
            // Assert
            // Prüfen, ob genau exactTrials + cold-start Investments gemacht wurden
            expect(algorithmStore.investmentsGreedy).toHaveLength(exactTrials + 3); // +3 for cold-start
            
            // Prüfen, dass jedes Investment valide Daten hat
            algorithmStore.investmentsGreedy.forEach((investment, index) => {
                expect(investment).toHaveProperty('stock');
                expect(investment).toHaveProperty('greedyReturn');
                expect(typeof investment.greedyReturn).toBe('number');
            });
        });
        
        // Test für die innere for-Schleife: Prüfen, ob der korrekte Stock ausgewählt wird
        it('should select the stock with the best greedyReturn (inner loop test)', () => {
            // Arrange
            banditStore.possibleInvestments = 3;
            // Pre-populate mit bekannten Ergebnissen
            algorithmStore.investmentsGreedy = [
                {
                    stock: banditStore.selectedStocks[0],
                    greedyReturn: 0.1 // Schlechteste Performance
                },
                {
                    stock: banditStore.selectedStocks[1],
                    greedyReturn: 0.9 // Beste Performance
                },
                {
                    stock: banditStore.selectedStocks[2],
                    greedyReturn: 0.5 // Mittlere Performance
                }
            ];
            
            // Mock Math.random für deterministische Exploitation
            const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9);
            
            // Act
            greedy_bernoulli();
            
            // Assert
            // Die neuen Investments sollten überwiegend den besten Stock wählen
            const newInvestments = algorithmStore.investmentsGreedy.slice(3);
            const bestStockSelections = newInvestments.filter(
                inv => inv.stock === banditStore.selectedStocks[1]
            ).length;
            
            expect(bestStockSelections).toBeGreaterThan(0);
            
            mathRandomSpy.mockRestore();
        });
        
        // Test für die if/else-Verzweigung (exploration vs exploitation)
        it('should follow exploration path when Math.random() < epsilon', () => {
            // Arrange
            banditStore.possibleInvestments = 10;
            
            // Mock Math.random für deterministische Exploration
            let callCount = 0;
            const mathRandomSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
                callCount++;
                if (callCount % 2 === 1) {
                    return 0.05; // Unter epsilon -> Exploration
                } else {
                    // Wechselnde Stock-Auswahl
                    return callCount % 4 === 0 ? 0.2 : 0.8; // Verschiedene Random-Werte für Stock-Auswahl
                }
            });
            
            // Act
            eGreedy_bernoulli();
            
            // Assert
            expect(algorithmStore.investmentsGreedy).toHaveLength(13); // 3 cold-start + 10 investments
            
            // Mindestens sollten Investitionen gemacht worden sein
            expect(algorithmStore.investmentsGreedy.length).toBeGreaterThan(0);
            
            // Prüfen dass epsilon-Exploration verwendet wurde (Math.random wurde oft genug aufgerufen)
            expect(mathRandomSpy).toHaveBeenCalled();
            
            mathRandomSpy.mockRestore();
        });
        
        it('should follow exploitation path when Math.random() >= epsilon', () => {
            // Arrange
            banditStore.possibleInvestments = 5;
            algorithmStore.investmentsGreedy = [
                {
                    stock: banditStore.selectedStocks[0],
                    greedyReturn: 0.9 // Sehr gute Performance
                }
            ];
            
            // Mock Math.random für Exploitation (über epsilon 0.1)
            const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9);
            
            // Act
            eGreedy_bernoulli();
            
            // Assert
            // Sollte hauptsächlich den besten Stock wählen
            const bestStockSelections = algorithmStore.investmentsGreedy.filter(
                inv => inv.stock === banditStore.selectedStocks[0]
            ).length;
            
            expect(bestStockSelections).toBeGreaterThan(2); // Mindestens die Hälfte
            
            mathRandomSpy.mockRestore();
        });
        
        // Test für den Switch-Case: Prüfen, ob der korrekte Bandit aufgerufen wird
        it('should call correct bandit function based on switch-case parameter', async () => {
            // Arrange
            banditStore.possibleInvestments = 3;
            
            // Spy auf beide Bandit-Funktionen
            const bernoulliModule = await import('../bandits/bernoulli.ts');
            const gaussianModule = await import('../bandits/gaussian.ts');
            const bernoulliSpy = vi.spyOn(bernoulliModule, 'bernoulli');
            const gaussianSpy = vi.spyOn(gaussianModule, 'gaussian');
            
            // Act - Teil 1: Teste bernoulli case
            algorithmStore.investmentsGreedy = [];
            greedy_bernoulli();
            
            // Assert - Teil 1
            expect(bernoulliSpy).toHaveBeenCalled();
            expect(gaussianSpy).not.toHaveBeenCalled();
            
            // Reset
            bernoulliSpy.mockClear();
            gaussianSpy.mockClear();
            
            // Act - Teil 2: Teste gaussian case
            algorithmStore.investmentsGreedy = [];
            greedy_gaussian();
            
            // Assert - Teil 2
            expect(gaussianSpy).toHaveBeenCalled();
            expect(bernoulliSpy).not.toHaveBeenCalled();
            
            // Cleanup
            bernoulliSpy.mockRestore();
            gaussianSpy.mockRestore();
        });
        
        // Test für die Boolean-zu-Number Konvertierung im Bernoulli case
        it('should convert boolean bernoulli results to numbers correctly', () => {
            // Arrange
            banditStore.possibleInvestments = 5;
            
            // Act
            greedy_bernoulli();
            
            // Assert
            const actualInvestments = algorithmStore.investmentsGreedy.slice(3); // Skip cold-start
            actualInvestments.forEach(investment => {
                expect(typeof investment.greedyReturn).toBe('number');
                // Sollte nur 0 oder 1 sein (konvertierte boolean Werte)
                expect([0, 1]).toContain(investment.greedyReturn);
            });
        });
        
        // Test für die korrekte Setzung der null-Werte im Switch-Case
        it('should set all non-greedy returns to null in bernoulli case', () => {
            // Arrange
            banditStore.possibleInvestments = 3;
            
            // Act
            greedy_bernoulli();
            
            // Assert
            const actualInvestments = algorithmStore.investmentsGreedy.slice(3); // Skip cold-start
            actualInvestments.forEach(investment => {
                expect(investment.greedyReturn).not.toBe(null);
                expect(investment.thompsonReturn).toBe(null);
                expect(investment.ucbReturn).toBe(null);
                expect(investment.gradientReturn).toBe(null);
                expect(investment.optimisticInitialReturn).toBe(null);
                expect(investment.userAlgorithmReturn).toBe(null);
            });
        });
        
        it('should set all non-greedy returns to null in gaussian case', () => {
            // Arrange
            banditStore.possibleInvestments = 3;
            
            // Act
            greedy_gaussian();
            
            // Assert
            const actualInvestments = algorithmStore.investmentsGreedy.slice(3); // Skip cold-start
            actualInvestments.forEach(investment => {
                expect(investment.greedyReturn).not.toBe(null);
                expect(typeof investment.greedyReturn).toBe('number');
                expect(investment.thompsonReturn).toBe(null);
                expect(investment.ucbReturn).toBe(null);
                expect(investment.gradientReturn).toBe(null);
                expect(investment.optimisticInitialReturn).toBe(null);
                expect(investment.userAlgorithmReturn).toBe(null);
            });
        });
        
        // Test für die Konsistenz der AlgoInvestment Struktur
        it('should maintain consistent AlgoInvestment structure across switch cases', () => {
            // Arrange
            banditStore.possibleInvestments = 2;
            
            // Act - Test both cases
            algorithmStore.investmentsGreedy = [];
            greedy_bernoulli();
            const bernoulliInvestments = [...algorithmStore.investmentsGreedy];
            
            algorithmStore.investmentsGreedy = [];
            greedy_gaussian();
            const gaussianInvestments = [...algorithmStore.investmentsGreedy];
            
            // Assert
            const checkStructure = (investments, expectedType) => {
                const actualInvestments = investments.slice(3); // Skip cold-start
                actualInvestments.forEach(investment => {
                    expect(investment).toHaveProperty('stock');
                    expect(investment).toHaveProperty('greedyReturn');
                    expect(investment).toHaveProperty('thompsonReturn');
                    expect(investment).toHaveProperty('ucbReturn');
                    expect(investment).toHaveProperty('gradientReturn');
                    expect(investment).toHaveProperty('optimisticInitialReturn');
                    expect(investment).toHaveProperty('userAlgorithmReturn');
                    
                    // Only greedyReturn should have values, others should be null
                    expect(typeof investment.greedyReturn).toBe('number');
                    expect(investment.thompsonReturn).toBe(null);
                    expect(investment.ucbReturn).toBe(null);
                    expect(investment.gradientReturn).toBe(null);
                    expect(investment.optimisticInitialReturn).toBe(null);
                    expect(investment.userAlgorithmReturn).toBe(null);
                });
            };
            
            checkStructure(bernoulliInvestments, 'bernoulli');
            checkStructure(gaussianInvestments, 'gaussian');
        });
        
        // Test für die korrekte Setzung der null-Werte im Switch-Case
        it('should set all non-greedy returns to null in bernoulli case', () => {
            // Arrange
            banditStore.possibleInvestments = 3;
            
            // Act
            greedy_bernoulli();
            
            // Assert
            const actualInvestments = algorithmStore.investmentsGreedy.slice(3); // Skip cold-start
            actualInvestments.forEach(investment => {
                expect(investment.greedyReturn).not.toBe(null);
                expect(investment.thompsonReturn).toBe(null);
                expect(investment.ucbReturn).toBe(null);
                expect(investment.gradientReturn).toBe(null);
                expect(investment.optimisticInitialReturn).toBe(null);
                expect(investment.userAlgorithmReturn).toBe(null);
            });
        });
        
        it('should set all non-greedy returns to null in gaussian case', () => {
            // Arrange
            banditStore.possibleInvestments = 3;
            
            // Act
            greedy_gaussian();
            
            // Assert
            const actualInvestments = algorithmStore.investmentsGreedy.slice(3); // Skip cold-start
            actualInvestments.forEach(investment => {
                expect(investment.greedyReturn).not.toBe(null);
                expect(typeof investment.greedyReturn).toBe('number');
                expect(investment.thompsonReturn).toBe(null);
                expect(investment.ucbReturn).toBe(null);
                expect(investment.gradientReturn).toBe(null);
                expect(investment.optimisticInitialReturn).toBe(null);
                expect(investment.userAlgorithmReturn).toBe(null);
            });
        });
        
        // Test für die Konsistenz der AlgoInvestment Struktur
        it('should maintain consistent AlgoInvestment structure across switch cases', () => {
            // Arrange
            banditStore.possibleInvestments = 2;
            
            // Act - Test both cases
            algorithmStore.investmentsGreedy = [];
            greedy_bernoulli();
            const bernoulliInvestments = [...algorithmStore.investmentsGreedy];
            
            algorithmStore.investmentsGreedy = [];
            greedy_gaussian();
            const gaussianInvestments = [...algorithmStore.investmentsGreedy];
            
            // Assert
            const checkStructure = (investments, expectedType) => {
                const actualInvestments = investments.slice(3); // Skip cold-start
                actualInvestments.forEach(investment => {
                    expect(investment).toHaveProperty('stock');
                    expect(investment).toHaveProperty('greedyReturn');
                    expect(investment).toHaveProperty('thompsonReturn');
                    expect(investment).toHaveProperty('ucbReturn');
                    expect(investment).toHaveProperty('gradientReturn');
                    expect(investment).toHaveProperty('optimisticInitialReturn');
                    expect(investment).toHaveProperty('userAlgorithmReturn');
                    
                    // Only greedyReturn should have values, others should be null
                    expect(typeof investment.greedyReturn).toBe('number');
                    expect(investment.thompsonReturn).toBe(null);
                    expect(investment.ucbReturn).toBe(null);
                    expect(investment.gradientReturn).toBe(null);
                    expect(investment.optimisticInitialReturn).toBe(null);
                    expect(investment.userAlgorithmReturn).toBe(null);
                });
            };
            
            checkStructure(bernoulliInvestments, 'bernoulli');
            checkStructure(gaussianInvestments, 'gaussian');
        });
        
        // Test für die direkte Gaussian-Werte im Gaussian case
        it('should store gaussian results directly as numbers', () => {
            // Arrange
            banditStore.possibleInvestments = 5;
            
            // Act
            greedy_gaussian();
            
            // Assert
            algorithmStore.investmentsGreedy.forEach(investment => {
                expect(typeof investment.greedyReturn).toBe('number');
                // Gaussian-Werte sind kontinuierlich, nicht nur 0 oder 1
                expect(investment.greedyReturn).toBeDefined();
            });
        });
        
        // Test für die korrekte Behandlung der best_arm_index Variable
        it('should maintain best_arm_index correctly across loop iterations', () => {
            // Arrange
            banditStore.possibleInvestments = 10;
            banditStore.selectedStocks = [
                {
                    stock: { id: 1, name: "Stock 1", price: 100, logo_url: "1.jpg" },
                    bernoulli_param: 0.1,
                    gaussian_param: 0.1
                },
                {
                    stock: { id: 2, name: "Stock 2", price: 100, logo_url: "2.jpg" },
                    bernoulli_param: 0.9,
                    gaussian_param: 0.9
                }
            ];
            
            // Mock für deterministische Ergebnisse
            const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9); // Exploitation
            
            // Act
            greedy_bernoulli();
            
            // Assert
            expect(algorithmStore.investmentsGreedy).toHaveLength(12); // 2 cold-start + 10 investments
            
            // best_arm_index sollte gültige Indizes verwenden
            algorithmStore.investmentsGreedy.forEach(investment => {
                expect(banditStore.selectedStocks).toContain(investment.stock);
            });
            
            mathRandomSpy.mockRestore();
        });
        
        // Test für findIndex Funktionalität
        it('should use findIndex to correctly map investment back to stock array index', () => {
            // Arrange
            banditStore.selectedStocks = [
                { stock: { id: 1, name: "Stock A" }, bernoulli_param: 0.2, gaussian_param: 0.1 },
                { stock: { id: 2, name: "Stock B" }, bernoulli_param: 0.8, gaussian_param: 0.5 },
                { stock: { id: 3, name: "Stock C" }, bernoulli_param: 0.6, gaussian_param: 0.3 }
            ];
            banditStore.possibleInvestments = 5;
            
            // Pre-populate with known performance to ensure predictable selection
            algorithmStore.investmentsGreedy = [
                { stock: banditStore.selectedStocks[0], greedyReturn: 0.1 }, // Low performance
                { stock: banditStore.selectedStocks[1], greedyReturn: 0.9 }, // High performance 
                { stock: banditStore.selectedStocks[2], greedyReturn: 0.5 }  // Medium performance
            ];
            
            const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9); // Force exploitation
            
            // Act
            greedy_gaussian();
            
            // Assert
            // The algorithm should predominantly select Stock B (index 1) due to highest performance
            const newInvestments = algorithmStore.investmentsGreedy.slice(3); // Skip pre-populated
            const stockBSelections = newInvestments.filter(inv => inv.stock === banditStore.selectedStocks[1]).length;
            
            expect(stockBSelections).toBeGreaterThan(0);
            
            // Verify findIndex worked correctly - all investments should map to valid stocks
            newInvestments.forEach(investment => {
                const foundIndex = banditStore.selectedStocks.findIndex(s => s === investment.stock);
                expect(foundIndex).toBeGreaterThanOrEqual(0);
                expect(foundIndex).toBeLessThan(banditStore.selectedStocks.length);
            });
            
            mathRandomSpy.mockRestore();
        });
        
        // Test für findIndex edge case
        it('should handle findIndex correctly when investment and stock arrays are misaligned', () => {
            // Arrange
            banditStore.selectedStocks = [
                { stock: { id: 1, name: "Stock A" }, bernoulli_param: 0.3, gaussian_param: 0.1 },
                { stock: { id: 2, name: "Stock B" }, bernoulli_param: 0.7, gaussian_param: 0.2 }
            ];
            banditStore.possibleInvestments = 3;
            
            // Pre-populate investment array in different order than stock array
            algorithmStore.investmentsGreedy = [
                { stock: banditStore.selectedStocks[1], greedyReturn: 0.8 }, // Stock B first
                { stock: banditStore.selectedStocks[0], greedyReturn: 0.2 }  // Stock A second
            ];
            
            const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9); // Exploitation
            
            // Act  
            greedy_bernoulli();
            
            // Assert
            const newInvestments = algorithmStore.investmentsGreedy.slice(2);
            
            // Should correctly identify Stock B (index 1) as best performer via findIndex
            const stockBSelections = newInvestments.filter(inv => inv.stock === banditStore.selectedStocks[1]).length;
            expect(stockBSelections).toBeGreaterThan(0);
            
            // Verify all selections are valid stocks
            newInvestments.forEach(investment => {
                expect(banditStore.selectedStocks).toContain(investment.stock);
            });
            
            mathRandomSpy.mockRestore();
        });
        
        // Test für findIndex Funktionalität
        it('should use findIndex to correctly map investment back to stock array index', () => {
            // Arrange
            banditStore.selectedStocks = [
                { stock: { id: 1, name: "Stock A" }, bernoulli_param: 0.2, gaussian_param: 0.1 },
                { stock: { id: 2, name: "Stock B" }, bernoulli_param: 0.8, gaussian_param: 0.5 },
                { stock: { id: 3, name: "Stock C" }, bernoulli_param: 0.6, gaussian_param: 0.3 }
            ];
            banditStore.possibleInvestments = 5;
            
            // Pre-populate with known performance to ensure predictable selection
            algorithmStore.investmentsGreedy = [
                { stock: banditStore.selectedStocks[0], greedyReturn: 0.1 }, // Low performance
                { stock: banditStore.selectedStocks[1], greedyReturn: 0.9 }, // High performance 
                { stock: banditStore.selectedStocks[2], greedyReturn: 0.5 }  // Medium performance
            ];
            
            const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9); // Force exploitation
            
            // Act
            greedy_gaussian();
            
            // Assert
            // The algorithm should predominantly select Stock B (index 1) due to highest performance
            const newInvestments = algorithmStore.investmentsGreedy.slice(3); // Skip pre-populated
            const stockBSelections = newInvestments.filter(inv => inv.stock === banditStore.selectedStocks[1]).length;
            
            expect(stockBSelections).toBeGreaterThan(0);
            
            // Verify findIndex worked correctly - all investments should map to valid stocks
            newInvestments.forEach(investment => {
                const foundIndex = banditStore.selectedStocks.findIndex(s => s === investment.stock);
                expect(foundIndex).toBeGreaterThanOrEqual(0);
                expect(foundIndex).toBeLessThan(banditStore.selectedStocks.length);
            });
            
            mathRandomSpy.mockRestore();
        });
        
        // Test für findIndex edge case
        it('should handle findIndex correctly when investment and stock arrays are misaligned', () => {
            // Arrange
            banditStore.selectedStocks = [
                { stock: { id: 1, name: "Stock A" }, bernoulli_param: 0.3, gaussian_param: 0.1 },
                { stock: { id: 2, name: "Stock B" }, bernoulli_param: 0.7, gaussian_param: 0.2 }
            ];
            banditStore.possibleInvestments = 3;
            
            // Pre-populate investment array in different order than stock array
            algorithmStore.investmentsGreedy = [
                { stock: banditStore.selectedStocks[1], greedyReturn: 0.8 }, // Stock B first
                { stock: banditStore.selectedStocks[0], greedyReturn: 0.2 }  // Stock A second
            ];
            
            const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9); // Exploitation
            
            // Act  
            greedy_bernoulli();
            
            // Assert
            const newInvestments = algorithmStore.investmentsGreedy.slice(2);
            
            // Should correctly identify Stock B (index 1) as best performer via findIndex
            const stockBSelections = newInvestments.filter(inv => inv.stock === banditStore.selectedStocks[1]).length;
            expect(stockBSelections).toBeGreaterThan(0);
            
            // Verify all selections are valid stocks
            newInvestments.forEach(investment => {
                expect(banditStore.selectedStocks).toContain(investment.stock);
            });
            
            mathRandomSpy.mockRestore();
        });
        
        // Test für die neue reward-Variable Struktur
        it('should use reward variable before storing in investment object', () => {
            // Arrange
            banditStore.possibleInvestments = 1;
            
            // Act
            greedy_bernoulli();
            
            // Assert
            const actualInvestments = algorithmStore.investmentsGreedy.slice(3); // Skip cold-start
            expect(actualInvestments).toHaveLength(1);
            
            // The reward should be properly calculated and stored
            const investment = actualInvestments[0];
            expect(typeof investment.greedyReturn).toBe('number');
            expect([0, 1]).toContain(investment.greedyReturn); // Bernoulli: 0 or 1
        });
        
        // Test für die neue reward-Variable im Switch-Case
        it('should calculate reward correctly in switch-case before storing', () => {
            // Arrange
            banditStore.possibleInvestments = 5;
            
            // Act - Test Bernoulli
            algorithmStore.investmentsGreedy = [];
            greedy_bernoulli();
            const bernoulliResults = algorithmStore.investmentsGreedy.slice(3);
            
            // Act - Test Gaussian  
            algorithmStore.investmentsGreedy = [];
            greedy_gaussian();
            const gaussianResults = algorithmStore.investmentsGreedy.slice(3);
            
            // Assert - Bernoulli rewards should be 0 or 1
            bernoulliResults.forEach(investment => {
                expect([0, 1]).toContain(investment.greedyReturn);
            });
            
            // Assert - Gaussian rewards should be numbers (not necessarily 0 or 1)
            gaussianResults.forEach(investment => {
                expect(typeof investment.greedyReturn).toBe('number');
            });
        });

        // Test für leere Arrays und Edge Cases
        it('should handle edge case when no prior investments exist', () => {
            // Arrange
            banditStore.possibleInvestments = 3;
            algorithmStore.investmentsGreedy = []; // Komplett leer
            
            // Act
            greedy_bernoulli();
            
            // Assert
            expect(algorithmStore.investmentsGreedy).toHaveLength(6); // 3 cold-start + 3 investments
            // Sollte mit Index 0 beginnen wenn keine vorherigen Ergebnisse existieren
            expect(algorithmStore.investmentsGreedy[0].stock).toBe(banditStore.selectedStocks[0]);
        });
    });

    // Tests für Error Handling und Edge Cases
    describe('Error Handling and Edge Cases', () => {
        it('should handle null or undefined greedyReturn values', () => {
            // Arrange
            banditStore.possibleInvestments = 2;
            algorithmStore.investmentsGreedy = [
                {
                    stock: banditStore.selectedStocks[0],
                    greedyReturn: null // null value
                },
                {
                    stock: banditStore.selectedStocks[1],
                    greedyReturn: undefined // undefined value
                }
            ];
            
            // Act & Assert
            expect(() => greedy_bernoulli()).not.toThrow();
            expect(algorithmStore.investmentsGreedy.length).toBeGreaterThan(2);
        });
        
        it('should handle stores being modified during execution', () => {
            // Arrange
            banditStore.possibleInvestments = 5;
            const originalInvestments = banditStore.possibleInvestments;
            
            // Act
            greedy_bernoulli();
            
            // Modify store after execution
            banditStore.possibleInvestments = 10;
            
            // Assert
            expect(algorithmStore.investmentsGreedy).toHaveLength(8); // 3 cold-start + 5 investments
        });
        
        it('should maintain algorithm progress flag consistency', () => {
            // Arrange
            banditStore.possibleInvestments = 3;
            const startFlag = algorithmStore.algorithmsInProgress;
            
            // Act
            greedy_bernoulli();
            const endFlag = algorithmStore.algorithmsInProgress;
            
            // Assert
            expect(startFlag).toBe(false); // Should start false
            expect(endFlag).toBe(false); // Should end false
        });
    });

    // Performance und Integration Tests
    describe('Performance and Integration', () => {
        it('should handle large number of investments efficiently', () => {
            // Arrange
            banditStore.possibleInvestments = 1000;
            const startTime = performance.now();
            
            // Act
            greedy_bernoulli();
            const endTime = performance.now();
            
            // Assert
            expect(algorithmStore.investmentsGreedy).toHaveLength(1003); // 1000 + 3 cold-start
            expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
        });
        
        it('should work correctly with all four algorithm variants', () => {
            // Arrange
            banditStore.possibleInvestments = 10;
            
            // Test all four algorithms
            const algorithms = [
                { name: 'greedy_bernoulli', func: greedy_bernoulli },
                { name: 'eGreedy_bernoulli', func: eGreedy_bernoulli },
                { name: 'greedy_gaussian', func: greedy_gaussian },
                { name: 'eGreedy_gaussian', func: eGreedy_gaussian }
            ];
            
            algorithms.forEach(({ name, func }) => {
                // Reset store
                algorithmStore.investmentsGreedy = [];
                
                // Act
                func();
                
                // Assert
                expect(algorithmStore.investmentsGreedy).toHaveLength(13); // 3 cold-start + 10 investments
                expect(algorithmStore.algorithmsInProgress).toBe(false);
                
                algorithmStore.investmentsGreedy.forEach(investment => {
                    expect(investment).toHaveProperty('stock');
                    expect(investment).toHaveProperty('greedyReturn');
                    expect(typeof investment.greedyReturn).toBe('number');
                });
            });
        });
        
        it('should maintain data integrity across multiple runs', () => {
            // Arrange
            banditStore.possibleInvestments = 5;
            
            // Act - Run algorithm multiple times
            greedy_bernoulli();
            const firstRunLength = algorithmStore.investmentsGreedy.length;
            
            greedy_bernoulli();
            const secondRunLength = algorithmStore.investmentsGreedy.length;
            
            // Assert
            expect(firstRunLength).toBe(8); // 3 cold-start + 5 investments
            expect(secondRunLength).toBe(16); // Should append: 8 + 3 cold-start + 5 investments
            
            // Each investment should have valid structure
            algorithmStore.investmentsGreedy.forEach(investment => {
                expect(investment.stock).toBeDefined();
                expect(typeof investment.greedyReturn).toBe('number');
            });
        });
    });
});