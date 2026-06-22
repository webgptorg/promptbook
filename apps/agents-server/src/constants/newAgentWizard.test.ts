import { describe, expect, it } from '@jest/globals';
import { DEFAULT_NEW_AGENT_WIZARD_MODE, isNewAgentWizardMode, parseNewAgentWizardMode } from './newAgentWizard';

describe('newAgentWizard', () => {
    it('recognizes supported modes', () => {
        expect(isNewAgentWizardMode('BOILERPLATE')).toBe(true);
        expect(isNewAgentWizardMode('WIZARD')).toBe(true);
        expect(isNewAgentWizardMode('MANGO_WIZARD')).toBe(true);
        expect(isNewAgentWizardMode('wizard')).toBe(false);
    });

    it('parses valid metadata values with normalization', () => {
        expect(parseNewAgentWizardMode('wizard')).toBe('WIZARD');
        expect(parseNewAgentWizardMode(' boilerplate ')).toBe('BOILERPLATE');
        expect(parseNewAgentWizardMode('manGo wizard')).toBe('MANGO_WIZARD');
        expect(parseNewAgentWizardMode('mango-wizard')).toBe('MANGO_WIZARD');
    });

    it('falls back safely for invalid values', () => {
        expect(parseNewAgentWizardMode('templates')).toBe(DEFAULT_NEW_AGENT_WIZARD_MODE);
        expect(parseNewAgentWizardMode(null, 'WIZARD')).toBe('WIZARD');
    });
});
