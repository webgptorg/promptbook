import type { ChatMessage, KnowledgeItem } from '../types';
import { postManGoOnboardingJson } from './postManGoOnboardingJson';

/**
 * Request sent by the step 4 test UI.
 */
export type AgentTestRequest = {
    readonly bookSource: string;
    readonly knowledge: readonly KnowledgeItem[];
    readonly messages: readonly ChatMessage[];
};

/**
 * Reply returned by the live step 4 agent test.
 */
export type AgentTestReply = {
    readonly role: 'agent';
    readonly content: string;
};

/**
 * Boundary for "run the agent against a test message".
 */
export type AgentTestService = {
    send(request: AgentTestRequest): Promise<AgentTestReply>;
};

/**
 * Public URLs of knowledge sources that finished uploading.
 *
 * @param knowledge - Wizard knowledge items.
 * @returns Public knowledge URLs.
 *
 * @private internal helper of the manGo agent test service.
 */
function knowledgeUrls(knowledge: readonly KnowledgeItem[]): readonly string[] {
    return knowledge
        .filter((item) => item.status === 'ready')
        .map((item) => (item.kind === 'url' ? item.url : item.publicUrl))
        .filter((url) => url.length > 0);
}

/**
 * API payload sent to the step 4 test endpoint.
 *
 * @private internal type of the manGo agent test service.
 */
type AgentTestApiRequest = {
    readonly bookSource: string;
    readonly knowledge: readonly string[];
    readonly messages: ReadonlyArray<Pick<ChatMessage, 'role' | 'content'>>;
};

/**
 * Endpoint-backed service used by the step 4 test UI.
 */
export const agentTestService: AgentTestService = {
    async send(request) {
        return postManGoOnboardingJson<AgentTestReply>('/api/onboarding/test', {
            bookSource: request.bookSource,
            knowledge: knowledgeUrls(request.knowledge),
            messages: request.messages.map((message) => ({ role: message.role, content: message.content })),
        } satisfies AgentTestApiRequest);
    },
};
