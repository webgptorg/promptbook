import { describe, expect, it } from '@jest/globals';
import { DEBUG_ALLOW_PAYED_TESTING } from './config';

describe('configuration', () => {
    it('prevents accidental costs', () => {
        expect(DEBUG_ALLOW_PAYED_TESTING).toBe(false);
    });
});

/**
 * TODO: [🧠] Maybe more elegant how to prevent accidental costs
 */
