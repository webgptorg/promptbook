import { describe, expect, it } from '@jest/globals';

import { createManGoOpenEditorRequest } from './createManGoOpenEditorRequest';
import type { OnboardingState } from '../types';

/**
 * Creates a minimal manGo onboarding state for open-editor request tests.
 *
 * @param state - Partial state overrides.
 * @returns Complete onboarding state.
 */
function createTestOnboardingState(state: Partial<OnboardingState>): OnboardingState {
    return {
        agentName: '',
        agentBrief: '',
        bookSource: '',
        knowledge: [],
        testMessages: [],
        savedAgentId: null,
        savedAgentTargetPath: null,
        ...state,
    };
}

describe('createManGoOpenEditorRequest', () => {
    it('creates a classic editor request from a partial manGo assignment', () => {
        const request = createManGoOpenEditorRequest(
            createTestOnboardingState({
                agentName: 'Invoice Helper',
                agentBrief: 'Tracks incoming invoices and reminds the accounting team.',
            }),
            'UNLISTED',
        );

        expect(request.visibility).toBe('UNLISTED');
        expect(request.agentSource).toContain('Invoice Helper');
        expect(request.agentSource).toContain('GOAL Tracks incoming invoices and reminds the accounting team.');
        expect(request.agentSource.trimEnd().endsWith('CLOSED')).toBe(true);
    });

    it('includes ready manGo knowledge sources in the classic editor draft', () => {
        const request = createManGoOpenEditorRequest(
            createTestOnboardingState({
                agentName: 'Support Helper',
                agentBrief: 'Answers support questions.',
                bookSource: 'Support Helper\n\nGOAL Answers support questions.\n\nCLOSED',
                knowledge: [
                    {
                        kind: 'url',
                        id: 'knowledge-url',
                        url: 'https://example.com/help',
                        status: 'ready',
                    },
                    {
                        kind: 'file',
                        id: 'knowledge-file',
                        name: 'support.pdf',
                        size: 42,
                        publicUrl: 'https://cdn.example.com/support.pdf',
                        objectKey: 'support.pdf',
                        status: 'ready',
                    },
                    {
                        kind: 'url',
                        id: 'uploading-url',
                        url: 'https://example.com/uploading',
                        status: 'uploading',
                    },
                ],
            }),
            'PRIVATE',
        );

        expect(request.visibility).toBe('PRIVATE');
        expect(request.agentSource).toContain('KNOWLEDGE https://example.com/help');
        expect(request.agentSource).toContain('KNOWLEDGE https://cdn.example.com/support.pdf');
        expect(request.agentSource).not.toContain('https://example.com/uploading');
    });
});
