import { useAlgorithmStore } from '@/stores/algorithms';

// Custom Map mit geschützten Default-Keys
class ProtectedMap<K> extends Set<K> {
  private protectedKeys: Set<K>;

  constructor(defaults: K[] = []) {
    super(defaults);
    this.protectedKeys = new Set(defaults);
  }

  delete(key: K): boolean {
    if (this.protectedKeys.has(key)) {
      console.warn(`Cannot delete protected key: ${key}`);
      return false;
    }
    return super.delete(key);
  }

  resetToDefaults(): void {
    super.clear();
    for (const key of this.protectedKeys) {
      this.add(key);
    }
  }

  addKey(key: K): boolean {
    if (this.has(key)) {
      console.warn(`Key ${key} already exists`);
      return false;
    }
    this.add(key);
    return true;
  }
}

// Parameter mit Default-Keys
export const algorithmParam = {
    eGreedy: new ProtectedMap<number>([0.1]),      // ε=0.1 ist default
    ucb: new ProtectedMap<number>([2]),            // c=2 ist default
    oiv: new ProtectedMap<number>([5]),            // initial=5 ist default
    gradient: new ProtectedMap<number>([0.1]),     // α=0.1 ist default
};

export function addAlgorithmParam(algorithm: keyof typeof algorithmParam, value: number): boolean {
    return algorithmParam[algorithm].addKey(value);
}

export function getDefaultParams() {
    return {
        eGreedy: 0.1,
        ucb: 2,
        oiv: 5,
        gradient: 0.1,
    };
}

export function setParamAlgo(algorithm: 'eGreedy' | 'ucb' | 'OIV' | 'gradient') {
    const algorithmStore = useAlgorithmStore();
    if (algorithmStore.algorithmsCompare === false) {
        switch (algorithm) {
            case "eGreedy":
                return getDefaultParams().eGreedy;
                break;
            case "ucb":
                return getDefaultParams().ucb;
                break;
            case "OIV":
                return getDefaultParams().oiv;
                break;
            case "gradient":
                return getDefaultParams().gradient;
                break;
        }
    } else {
        return getDefaultParams().ucb;
    }
}