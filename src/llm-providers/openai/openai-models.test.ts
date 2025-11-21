import { describe, expect, it } from '@jest/globals';
import { assertUniqueModels } from '../_common/utils/assertUniqueModels';
import { OPENAI_MODELS } from './openai-models';

describe('OPENAI_MODELS', () => {
    it('should NOT have duplicate models', () => {
        expect(() => assertUniqueModels(OPENAI_MODELS)).not.toThrow();
    });
});

/**
 * TODO: [🧠] Maybe do this test for all model providers + boilerplate
 */
