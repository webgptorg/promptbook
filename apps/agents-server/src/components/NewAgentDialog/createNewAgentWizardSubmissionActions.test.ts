import { describe, expect, it, jest } from '@jest/globals';
import { createNewAgentWizardSubmissionActions } from './createNewAgentWizardSubmissionActions';
import { createInitialWizardState } from './NewAgentWizardState';

describe('createNewAgentWizardSubmissionActions', () => {
    it('prefills the Book editor from the current wizard draft', () => {
        const onCreate = jest.fn(async () => undefined);
        const onOpenEditor = jest.fn();
        const setIsCreating = jest.fn();
        const state = {
            ...createInitialWizardState('UNLISTED', 'Starter Agent'),
            name: 'Support Switchboard',
            description: 'Handles billing handoffs.',
            goal: 'Route billing questions to the right teammate.',
        };

        const { handleOpenAdvancedEditor } = createNewAgentWizardSubmissionActions({
            state,
            mode: 'WIZARD',
            onCreate,
            onOpenEditor,
            setIsCreating,
        });

        handleOpenAdvancedEditor();

        expect(onOpenEditor).toHaveBeenCalledTimes(1);
        expect(onOpenEditor).toHaveBeenCalledWith(
            expect.objectContaining({
                visibility: 'UNLISTED',
                agentSource: expect.stringContaining('Support Switchboard'),
            }),
        );

        const editorRequest = onOpenEditor.mock.calls[0]?.[0] as { agentSource: string; visibility: string } | undefined;
        expect(editorRequest?.agentSource).toContain('META DESCRIPTION Handles billing handoffs.');
        expect(editorRequest?.agentSource).toContain('GOAL Route billing questions to the right teammate.');
    });
});
