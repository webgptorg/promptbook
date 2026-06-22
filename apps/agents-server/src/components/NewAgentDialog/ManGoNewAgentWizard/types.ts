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
 * The full in-memory state of one onboarding session. Persisted to `sessionStorage`
 * so a refresh does not throw away work-in-progress. No server-side persistence in v1.
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
