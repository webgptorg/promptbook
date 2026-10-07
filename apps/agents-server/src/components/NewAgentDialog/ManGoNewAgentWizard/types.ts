/**
 * Domain types for the onboarding wizard (Phase 1).
 *
 * These are the module's own types — anything coming from the outside (API responses,
 * server functions) is mapped onto these in `services/` so the UI never depends on
 * external shapes directly.
 */

export type KnowledgeItemStatus = 'uploading' | 'ready' | 'error';

export type KnowledgeFileItem = {
    readonly kind: 'file';
    readonly id: string;
    readonly name: string;
    readonly size: number;
    readonly publicUrl: string;
    readonly objectKey: string;
    readonly status: KnowledgeItemStatus;
};

export type KnowledgeUrlItem = {
    readonly kind: 'url';
    readonly id: string;
    readonly url: string;
    readonly status: KnowledgeItemStatus;
};

export type KnowledgeItem = KnowledgeFileItem | KnowledgeUrlItem;

export type ChatRole = 'user' | 'agent';

export type ChatMessage = {
    readonly id: string;
    readonly role: ChatRole;
    readonly content: string;
};

/**
 * Content owned by one explicitly opened onboarding session.
 * Closing or reloading abandons the in-memory draft; a new opening never resumes it.
 */
export type OnboardingState = {
    readonly agentName: string;
    readonly agentBrief: string;
    readonly bookSource: string;
    readonly knowledge: readonly KnowledgeItem[];
    readonly testMessages: readonly ChatMessage[];
    /** Permanent id of the created agent once this session reached "Hotovo" (so we save it exactly once). */
    readonly savedAgentId: string | null;
    /** Route opened by the final CTA after the agent is created. */
    readonly savedAgentTargetPath: string | null;
};

/** Draft content and transient UI state that survive navigation within one creation session. */
export type OnboardingDraftState = OnboardingState & {
    readonly currentPath: string;
    readonly bookAssignment: Pick<OnboardingState, 'agentName' | 'agentBrief'> | null;
    readonly bookGeneration: {
        readonly phase: 'init' | 'generating' | 'ready' | 'error';
        readonly error: string | null;
    };
    readonly knowledgeUrlInput: string;
    readonly knowledgeUrlError: string | null;
    readonly testMode: 'email' | 'chat';
    readonly testEmail: string;
    readonly testChatInput: string;
    readonly isSendingTestMessage: boolean;
    readonly emailTest: {
        readonly phase: 'idle' | 'running' | 'done' | 'error';
        readonly reply: string;
        readonly error: string | null;
        readonly checks: ReadonlyArray<{ readonly status: 'ok' | 'warn'; readonly text: string }> | null;
        readonly isEvaluating: boolean;
    };
    readonly isCreatingAgent: boolean;
    readonly creationError: string | null;
};
