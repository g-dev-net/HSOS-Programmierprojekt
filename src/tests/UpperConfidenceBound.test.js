import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { upperConfidenceBound_bernoulli, upperConfidenceBound_gaussian } from '../algorithms/UpperConfidenceBound.ts';
import { useBanditStore } from '@/stores/bandit';
import { useAlgorithmStore } from '@/stores/algorithms';
import { bernoulli } from '../bandits/bernoulli.js';
import { gaussian } from '../bandits/gaussian.js';

// Mocks für reproduzierbare Tests
vi.mock('../bandits/bernoulli.js', () => ({
  bernoulli: vi.fn()
}));
vi.mock('../bandits/gaussian.js', () => ({
  gaussian: vi.fn()
}));

describe('Upper Confidence Bound Algorithm', () => {
  let banditStore;
  let algorithmStore;

  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);

    banditStore = useBanditStore();
    algorithmStore = useAlgorithmStore();

    // Stores zurücksetzen
    banditStore.selectedStocks = [];
    banditStore.possibleInvestments = 0;

    // UCB eigener Speicherbereich
    algorithmStore.investmentsUCB = [];
    algorithmStore.algorithmsInProgress = false;

    vi.clearAllMocks();
  });

  describe('Store Integration', () => {
    it('greift korrekt auf den Bandit Store zu', () => {
      banditStore.selectedStocks = [
        { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 }
      ];
      banditStore.possibleInvestments = 1;

      expect(banditStore.selectedStocks).toHaveLength(1);
      expect(banditStore.possibleInvestments).toBe(1);
    });

    it('schreibt nur in investmentsUCB und setzt algorithmsInProgress korrekt', () => {
      const stock = { id: 1, name: 'Apple', bernoulli_param: 0.6, gaussian_param: 0.05 };
      banditStore.selectedStocks = [stock];
      banditStore.possibleInvestments = 1;

      bernoulli.mockReturnValue(true);

      expect(algorithmStore.algorithmsInProgress).toBe(false);

      upperConfidenceBound_bernoulli();

      expect(algorithmStore.algorithmsInProgress).toBe(false);
      expect(algorithmStore.investmentsUCB).toHaveLength(1);
      const entry = algorithmStore.investmentsUCB[0];
      expect(entry.stock).toStrictEqual(stock);
      expect(entry.ucbReturn).toBe(1);
    });
  });

  describe('Initialisierung', () => {
    it('zieht jeden Arm einmal wenn Budget reicht', () => {
      const a = { id: 1, name: 'A', bernoulli_param: 0.6, gaussian_param: 0.05 };
      const b = { id: 2, name: 'B', bernoulli_param: 0.5, gaussian_param: 0.05 };
      banditStore.selectedStocks = [a, b];
      banditStore.possibleInvestments = 2;

      bernoulli
        .mockReturnValueOnce(1) // init A
        .mockReturnValueOnce(0); // init B

      upperConfidenceBound_bernoulli();

      expect(algorithmStore.investmentsUCB).toHaveLength(2);
      const stocksPulled = algorithmStore.investmentsUCB.map(e => e.stock);
      expect(stocksPulled).toContainEqual(a);
      expect(stocksPulled).toContainEqual(b);
    });

    it('respektiert Budget wenn T < K und stoppt nach der Initialisierung', () => {
      const a = { id: 1, name: 'A', bernoulli_param: 0.6, gaussian_param: 0.05 };
      const b = { id: 2, name: 'B', bernoulli_param: 0.5, gaussian_param: 0.05 };
      banditStore.selectedStocks = [a, b];
      banditStore.possibleInvestments = 1;

      bernoulli.mockReturnValue(1);

      upperConfidenceBound_bernoulli();

      expect(algorithmStore.investmentsUCB).toHaveLength(1);
    });
  });

  describe('Auswahl Logik', () => {
    it('wählt den Arm mit höherem empirischem Mittel wenn Zähler gleich sind', () => {
      const a = { id: 1, name: 'A', bernoulli_param: 0.6, gaussian_param: 0.05 };
      const b = { id: 2, name: 'B', bernoulli_param: 0.6, gaussian_param: 0.05 };
      banditStore.selectedStocks = [a, b];
      banditStore.possibleInvestments = 3;

      bernoulli
        .mockReturnValueOnce(1) // init A -> mean A = 1
        .mockReturnValueOnce(0) // init B -> mean B = 0
        .mockReturnValueOnce(1); // dritter Zug

      upperConfidenceBound_bernoulli();

      const inv = algorithmStore.investmentsUCB;
      expect(inv).toHaveLength(3);
      expect(inv[2].stock).toStrictEqual(a);
    });

    it('bevorzugt den seltener gezogenen Arm bei gleichen Mitteln', () => {
      const a = { id: 1, name: 'A', bernoulli_param: 0.6, gaussian_param: 0.05 };
      const b = { id: 2, name: 'B', bernoulli_param: 0.6, gaussian_param: 0.05 };
      banditStore.selectedStocks = [a, b];
      banditStore.possibleInvestments = 4;

      bernoulli
        .mockReturnValueOnce(1) // A init
        .mockReturnValueOnce(1) // B init
        .mockReturnValueOnce(1) // 3. Zug -> A
        .mockReturnValueOnce(1); // 4. Zug -> B wegen größerem Bonus

      upperConfidenceBound_bernoulli();

      const inv = algorithmStore.investmentsUCB;
      expect(inv).toHaveLength(4);
      expect(inv[2].stock).toStrictEqual(a);
      expect(inv[3].stock).toStrictEqual(b);
    });
  });

  describe('Bernoulli Pfad', () => {
    it('schreibt Bernoulli Rewards in ucbReturn', () => {
      const s = { id: 1, name: 'S', bernoulli_param: 0.8, gaussian_param: 0.05 };
      banditStore.selectedStocks = [s];
      banditStore.possibleInvestments = 2;

      bernoulli
        .mockReturnValueOnce(1)
        .mockReturnValueOnce(0);

      upperConfidenceBound_bernoulli();

      const inv = algorithmStore.investmentsUCB;
      expect(inv).toHaveLength(2);
      expect(inv[0].ucbReturn).toBe(1);
      expect(inv[1].ucbReturn).toBe(0);
    });
  });

  describe('Gaussian Pfad', () => {
    it('ruft gaussian() auf und speichert den Wert', () => {
      const s = { id: 1, name: 'S', bernoulli_param: 0.5, gaussian_param: 0.05 };
      banditStore.selectedStocks = [s];
      banditStore.possibleInvestments = 1;

      gaussian.mockReturnValue(0.1234);

      upperConfidenceBound_gaussian();

      expect(gaussian).toHaveBeenCalledTimes(1);
      const inv = algorithmStore.investmentsUCB;
      expect(inv).toHaveLength(1);
      expect(inv[0].ucbReturn).toBe(0.1234);
    });
  });

  describe('Randfälle', () => {
    it('tut nichts wenn keine Stocks vorhanden sind', () => {
      banditStore.selectedStocks = [];
      banditStore.possibleInvestments = 3;

      upperConfidenceBound_bernoulli();

      expect(bernoulli).not.toHaveBeenCalled();
      expect(algorithmStore.investmentsUCB).toHaveLength(0);
    });

    it('tut nichts wenn possibleInvestments gleich 0 ist', () => {
      const s = { id: 1, name: 'S', bernoulli_param: 0.6, gaussian_param: 0.05 };
      banditStore.selectedStocks = [s];
      banditStore.possibleInvestments = 0;

      upperConfidenceBound_bernoulli();

      expect(algorithmStore.investmentsUCB).toHaveLength(0);
      expect(bernoulli).not.toHaveBeenCalled();
    });
  });
});
