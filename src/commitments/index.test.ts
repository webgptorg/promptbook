import { describe, expect, it } from '@jest/globals';
import { COMMITMENT_REGISTRY } from './index';

/**
 * Commitment families that should keep the singular keyword before the plural alias in the raw registry.
 */
const SINGULAR_PLURAL_COMMITMENT_FAMILIES = [
    ['PERSONA', 'PERSONAE'],
    ['MEMORY', 'MEMORIES'],
    ['STYLE', 'STYLES'],
    ['RULE', 'RULES'],
    ['LANGUAGE', 'LANGUAGES'],
    ['GOAL', 'GOALS'],
    ['FORMAT', 'FORMATS'],
    ['TEMPLATE', 'TEMPLATES'],
    ['IMPORT', 'IMPORTS'],
    ['MODEL', 'MODELS'],
    ['ACTION', 'ACTIONS'],
    ['MESSAGE', 'MESSAGES'],
    ['SCENARIO', 'SCENARIOS'],
    ['WALLET', 'WALLETS'],
    ['NOTE', 'NOTES'],
] as const;

describe('COMMITMENT_REGISTRY singular/plural order', () => {
    it('keeps the singular commitment before the plural alias', () => {
        for (const [singularType, pluralType] of SINGULAR_PLURAL_COMMITMENT_FAMILIES) {
            const singularIndex = COMMITMENT_REGISTRY.findIndex(
                (commitmentDefinition) => commitmentDefinition.type === singularType,
            );
            const pluralIndex = COMMITMENT_REGISTRY.findIndex(
                (commitmentDefinition) => commitmentDefinition.type === pluralType,
            );

            expect(singularIndex).toBeGreaterThanOrEqual(0);
            expect(pluralIndex).toBeGreaterThanOrEqual(0);
            expect(singularIndex).toBeLessThan(pluralIndex);
        }
    });
});
