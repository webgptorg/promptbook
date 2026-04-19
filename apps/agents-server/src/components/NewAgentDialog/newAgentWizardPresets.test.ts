import { describe, expect, it } from '@jest/globals';
import { getGroupedCommitmentDefinitions } from '../../../../../src/commitments/_common/getGroupedCommitmentDefinitions';
import {
    NEW_AGENT_WIZARD_CONFIGURABLE_CAPABILITY_COMMITMENTS,
    NEW_AGENT_WIZARD_SELECTABLE_CAPABILITY_COMMITMENTS,
    getNewAgentWizardStepDefinitions,
} from './newAgentWizardPresets';

describe('newAgentWizardPresets', () => {
    it('lists every concrete USE commitment in the wizard-selectable capability catalogue', () => {
        const useCommitmentTypes = getGroupedCommitmentDefinitions()
            .map(({ primary }) => primary.type)
            .filter((type) => type.startsWith('USE ') && type !== 'USE')
            .sort();
        const wizardCapabilityTypes = [...NEW_AGENT_WIZARD_SELECTABLE_CAPABILITY_COMMITMENTS].sort();

        expect(wizardCapabilityTypes).toEqual(useCommitmentTypes);
    });

    it('marks content-driven capabilities for the extra USE setup step', () => {
        const configurableCapabilityTypes = [...NEW_AGENT_WIZARD_CONFIGURABLE_CAPABILITY_COMMITMENTS]
            .sort();

        expect(configurableCapabilityTypes).toEqual(['USE CALENDAR', 'USE EMAIL', 'USE MCP', 'USE PROJECT']);
    });

    it('adds the optional USE setup step only when a selected capability needs it', () => {
        const browserOnlyStepIds = getNewAgentWizardStepDefinitions(['browser']).map((stepDefinition) => stepDefinition.id);
        const projectStepIds = getNewAgentWizardStepDefinitions(['project']).map((stepDefinition) => stepDefinition.id);

        expect(browserOnlyStepIds).toEqual(['basic', 'persona', 'team', 'writing', 'rules', 'knowledge']);
        expect(projectStepIds).toEqual(['basic', 'persona', 'use-setup', 'team', 'writing', 'rules', 'knowledge']);
    });
});
