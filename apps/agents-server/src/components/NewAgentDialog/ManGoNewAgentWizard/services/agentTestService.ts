import { spaceTrim } from 'spacetrim';

import type { ChatMessage, KnowledgeItem } from '../types';

export type AgentTestRequest = {
    readonly bookSource: string;
    readonly knowledge: readonly KnowledgeItem[];
    readonly messages: readonly ChatMessage[];
};

export type AgentTestReply = {
    readonly role: 'agent';
    readonly content: string;
};

/**
 * Boundary for "run the agent against a test message". Backed by the `runAgentTest`
 * server function (Promptbook `LiteAgent`). The UI depends only on this interface — see
 * the wizard Test step.
 */
export type AgentTestService = {
    send(request: AgentTestRequest): Promise<AgentTestReply>;
}

/** Public URLs of knowledge sources that finished uploading (files → S3 URL, links → URL). */
function knowledgeUrls(knowledge: readonly KnowledgeItem[]): string[] {
    return knowledge
        .filter((item) => item.status === 'ready')
        .map((item) => (item.kind === 'url' ? item.url : item.publicUrl))
        .filter((url) => url.length > 0);
}

/**
 * Resolves the last user message sent to the preview responder.
 *
 * @param messages - Chat history collected in the test step.
 * @returns Most recent user message content.
 */
function getLastUserMessage(messages: readonly ChatMessage[]): string {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message.role === 'user') {
            return message.content;
        }
    }

    return '';
}

export const agentTestService: AgentTestService = {
    async send(request) {
        const lastUserMessage = getLastUserMessage(request.messages);
        const readyKnowledgeUrls = knowledgeUrls(request.knowledge);
        const reply = spaceTrim(`
            Návrh odpovědi podle aktuálního booku:

            Rozumím požadavku: "${lastUserMessage || 'bez zadání'}"

            Doporučený postup:
            1. Odpovědět věcně a stručně podle pravidel v booku.
            2. Zmínit dostupný kontext ze znalostní báze${
                readyKnowledgeUrls.length > 0 ? ` (${readyKnowledgeUrls.length} zdrojů)` : ''
            }.
            3. Pokud chybí jistota, požádat o doplnění nebo předat člověku.
        `);

        return { role: 'agent', content: reply };
    },
};
