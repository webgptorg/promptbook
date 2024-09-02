import { describe, expect, it } from '@jest/globals';
import { IS_COST_PREVENTED } from './config';

describe('configuration', () => {
    it('prevents accidental costs', () => {
        expect(IS_COST_PREVENTED).toBe(true);
    });
});

/**
 * TODO: [🧠] Maybe more elegant how to prevent accidental costs
 */
