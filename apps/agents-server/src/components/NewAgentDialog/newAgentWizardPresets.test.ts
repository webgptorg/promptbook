import { describe, expect, it } from '@jest/globals';
import { getGroupedCommitmentDefinitions } from '../../../../../src/commitments/_common/getGroupedCommitmentDefinitions';
import { NEW_AGENT_WIZARD_CAPABILITY_PRESETS } from './newAgentWizardPresets';

describe('newAgentWizardPresets', () => {
    it('lists every concrete USE commitment in the capability catalogue', () => {
        const useCommitmentTypes = getGroupedCommitmentDefinitions()
            .map(({ primary }) => primary.type)
            .filter((type) => type.startsWith('USE ') && type !== 'USE')
            .sort();
        const wizardCapabilityTypes = NEW_AGENT_WIZARD_CAPABILITY_PRESETS.map((preset) => preset.commitmentKeyword).sort();

        expect(wizardCapabilityTypes).toEqual(useCommitmentTypes);
    });

    it('keeps content-driven capabilities in advanced-editor mode', () => {
        const advancedOnlyCapabilityTypes = NEW_AGENT_WIZARD_CAPABILITY_PRESETS.filter(
            (preset) => preset.availability === 'advanced-editor',
        )
            .map((preset) => preset.commitmentKeyword)
            .sort();

        expect(advancedOnlyCapabilityTypes).toEqual(['USE MCP', 'USE PROJECT']);
    });
});
