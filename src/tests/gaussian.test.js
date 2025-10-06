// gaussian.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

// WICHTIG: Modul vor dem Import der zu testenden Funktion mocken
vi.mock('d3-random', () => ({
  randomNormal: vi.fn(),
}));

import { gaussian } from '../bandits/gaussian.ts';
import { randomNormal } from 'd3-random';

describe('gaussian', () => {
  const mockSample = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // randomNormal soll unsere Sample-Funktion zurückgeben
    randomNormal.mockReturnValue(mockSample);
  });

  it('ruft randomNormal mit mu und sigma=0.5 auf', () => {
    mockSample.mockReturnValue(1.23);

    const mu = 0.7;
    const result = gaussian(mu);

    expect(randomNormal).toHaveBeenCalledTimes(1);
    expect(randomNormal).toHaveBeenCalledWith(mu, 0.5);
    expect(result).toBe(1.23);
  });

  it('gibt einen number zurück', () => {
    mockSample.mockReturnValue(0.42);
    const value = gaussian(0.1);
    expect(typeof value).toBe('number');
  });

  it('verwendet bei mehreren Aufrufen den jeweils nächsten Sample-Wert', () => {
    mockSample
      .mockReturnValueOnce(-0.1)
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.9);

    expect(gaussian(0)).toBe(-0.1);
    expect(gaussian(0)).toBe(0.0);
    expect(gaussian(0)).toBe(0.9);
    expect(mockSample).toHaveBeenCalledTimes(3);
  });
});
