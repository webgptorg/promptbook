import { describe, expect, it } from '@jest/globals';
import { IS_COST_PREVENTED, IS_PIPELINE_LOGIC_VALIDATED } from './config';

describe('configuration', () => {
    it('prevents accidental costs', () => {
        expect(IS_COST_PREVENTED).toBe(true);
    });

    it('checks samples logic', () => {
        expect(IS_PIPELINE_LOGIC_VALIDATED).toBe(true);
    });
});

/**
 * TODO: [🧠] Maybe more elegant how to prevent accidental costs
 */
