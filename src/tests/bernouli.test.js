import {bernouli} from '../bandits/bernouli.js';
import { expect, test } from 'vitest';

test('bernouli', () => {
        expect(bernouli(5)).toBe(true);
} );
