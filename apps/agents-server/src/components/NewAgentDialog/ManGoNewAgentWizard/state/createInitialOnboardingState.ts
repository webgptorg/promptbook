import { EMAIL_SCENARIOS } from '../config/emailScenarios';
import { ONBOARDING_ENTRY_PATH } from '../config/steps';
import type { OnboardingDraftState } from '../types';

/** Creates independent collections and UI state for each explicit new-agent request. */
export function createInitialOnboardingState(): OnboardingDraftState {
    return {
        agentName: '',
        agentBrief: '',
        bookSource: '',
        bookAssignment: null,
        bookGeneration: { phase: 'init', error: null },
        knowledge: [],
        knowledgeUrlInput: '',
        knowledgeUrlError: null,
        testMessages: [],
        testMode: 'email',
        testEmail: EMAIL_SCENARIOS[1].email,
        testChatInput: '',
        isSendingTestMessage: false,
        emailTest: { phase: 'idle', reply: '', error: null, checks: null, isEvaluating: false },
        isCreatingAgent: false,
        creationError: null,
        savedAgentId: null,
        savedAgentTargetPath: null,
        currentPath: ONBOARDING_ENTRY_PATH,
    };
}
