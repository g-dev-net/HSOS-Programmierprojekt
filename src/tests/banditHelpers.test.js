import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateGaussianParam, generateBernoulliParam } from '../assets/utils/banditHelpers.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateGaussianParam', () => {
  it('liefert -0.1 beim unteren Rand mit Math.random = 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const v = generateGaussianParam();
    expect(v).toBeCloseTo(-0.1, 10);
  });

  it('liefert 0 in der Mitte mit Math.random = 0.5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const v = generateGaussianParam();
    expect(v).toBeCloseTo(0, 10);
  });

  it('liefert 0.1 beim oberen Rand mit Math.random = 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const v = generateGaussianParam();
    expect(v).toBeCloseTo(0.1, 10);
  });

  it('bleibt im Bereich [-0.1, 0.1] bei vielen Ziehungen', () => {
    for (let i = 0; i < 10000; i++) {
      const v = generateGaussianParam();
      expect(v).toBeGreaterThanOrEqual(-0.1);
      expect(v).toBeLessThanOrEqual(0.1);
    }
  });
});

describe('generateBernoulliParam', () => {
  it('liefert 0.01 beim unteren Rand mit Math.random = 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const v = generateBernoulliParam();
    expect(v).toBeCloseTo(0.01, 10);
  });

  it('liefert 0.5 in der Mitte mit Math.random = 0.5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const v = generateBernoulliParam();
    expect(v).toBeCloseTo(0.5, 10);
  });

  it('liefert 0.99 beim oberen Rand mit Math.random = 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const v = generateBernoulliParam();
    expect(v).toBeCloseTo(0.99, 10);
  });

  it('bleibt im Bereich [0.01, 0.99] bei vielen Ziehungen', () => {
    for (let i = 0; i < 10000; i++) {
      const v = generateBernoulliParam();
      expect(v).toBeGreaterThanOrEqual(0.01);
      expect(v).toBeLessThanOrEqual(0.99);
    }
  });
});
