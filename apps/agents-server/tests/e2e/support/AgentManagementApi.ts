import type { Page } from 'playwright/test';
import { spaceTrim } from 'spacetrim';

/**
 * Input contract for creating one deterministic test agent through the management API.
 */
type CreateTestAgentOptions = {
    /**
     * Human-readable label used in the agent source.
     *
     * @private internal utility of AgentManagementApi
     */
    readonly label: string;
    /**
     * Persona sentence inserted into the agent source.
     *
     * @private internal utility of AgentManagementApi
     */
    readonly persona: string;
    /**
     * Optional rule sentence inserted into the agent source.
     *
     * @private internal utility of AgentManagementApi
     */
    readonly rule?: string;
    /**
     * Optional configured initial message for the created agent.
     *
     * @private internal utility of AgentManagementApi
     */
    readonly initialMessage?: string;
};

/**
 * Minimal management-agent payload needed by Playwright e2e helpers.
 */
type ManagedAgent = {
    /**
     * Canonical browser-route slug and user-chat API identifier.
     *
     * @private internal utility of AgentManagementApi
     */
    readonly agentName: string;
    /**
     * Stable standalone chat route returned by the management API.
     *
     * @private internal utility of AgentManagementApi
     */
    readonly managementChatUrl: string;
};

/**
 * Minimal seeded chat payload returned by the durable user-chat API.
 */
type SeededChat = {
    /**
     * Durable user-chat identifier.
     *
     * @private internal utility of AgentManagementApi
     */
    readonly id: string;
};

/**
 * Default RULE sentence used by the e2e management-agent fixtures.
 */
const DEFAULT_RULE = 'Keep replies concise.';

/**
 * Builds one deterministic agent source string for the management API.
 *
 * @param options - Label and optional commitment text used by the created agent.
 * @returns Stable agent source string.
 * @private internal utility of AgentManagementApi
 */
function buildTestAgentSource(options: CreateTestAgentOptions): string {
    return spaceTrim(`
        ${options.label}
        PERSONA ${options.persona}
        RULE ${options.rule ?? DEFAULT_RULE}
        ${options.initialMessage ? `INITIAL MESSAGE ${options.initialMessage}` : ''}
    `);
}

/**
 * Creates one management API token for the authenticated browser session.
 *
 * @param page - Current Playwright page.
 * @param note - Human-readable note stored with the created token.
 * @returns Raw bearer token.
 */
async function createManagementApiToken(page: Page, note: string): Promise<string> {
    return page.evaluate(
        async ({ note: tokenNote }) => {
            const response = await fetch('/api/api-tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    note: tokenNote,
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to create management API token: ${response.status}`);
            }

            const payload = (await response.json()) as { token?: string };
            if (!payload.token) {
                throw new Error('Management API token response did not include `token`.');
            }

            return payload.token;
        },
        { note },
    );
}

/**
 * Creates one deterministic test agent through the management API.
 *
 * @param page - Current Playwright page.
 * @param apiKey - Bearer token used for the management API call.
 * @param options - Label and optional commitment text used by the created agent.
 * @returns Canonical agent routing data.
 */
async function createTestAgent(page: Page, apiKey: string, options: CreateTestAgentOptions) {
    return page.evaluate(
        async ({ apiKey: token, source }) => {
            const response = await fetch('/api/v1/agents', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source,
                    visibility: 'UNLISTED',
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to create test agent: ${response.status}`);
            }

            const payload = (await response.json()) as {
                agent?: {
                    agentName?: string;
                    links?: {
                        chatUrl?: string;
                    };
                };
            };

            if (!payload.agent?.agentName || !payload.agent.links?.chatUrl) {
                throw new Error('Test agent response did not include chat routing data.');
            }

            return {
                agentName: payload.agent.agentName,
                managementChatUrl: payload.agent.links.chatUrl,
            } satisfies ManagedAgent;
        },
        {
            apiKey,
            source: buildTestAgentSource(options),
        },
    );
}

/**
 * Creates one durable seeded chat with stable user/agent messages.
 *
 * @param page - Current Playwright page.
 * @param agentName - Canonical agent slug.
 * @param title - First user message used as chat title.
 * @returns Newly created chat identifier.
 */
async function createSeededChat(page: Page, agentName: string, title: string) {
    return page.evaluate(
        async ({ agentName: currentAgentName, title: currentTitle }) => {
            const now = new Date().toISOString();
            const safeId = currentTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const payload = {
                messages: [
                    {
                        id: `user-${safeId}`,
                        sender: 'USER',
                        content: currentTitle,
                        createdAt: now,
                        isComplete: true,
                    },
                    {
                        id: `agent-${safeId}`,
                        sender: 'AGENT',
                        content: `Reply for ${currentTitle}`,
                        createdAt: now,
                        isComplete: true,
                    },
                ],
            };
            const response = await fetch(`/agents/${encodeURIComponent(currentAgentName)}/api/user-chats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`Failed to create seeded chat: ${response.status}`);
            }

            const chatDetail = (await response.json()) as { chat?: { id?: string } };
            if (!chatDetail.chat?.id) {
                throw new Error('Seeded chat response did not include `chat.id`.');
            }

            return { id: chatDetail.chat.id } satisfies SeededChat;
        },
        { agentName, title },
    );
}

/**
 * Shared management API helpers for Agents Server Playwright coverage.
 */
export const AgentManagementApi = {
    createManagementApiToken,
    createTestAgent,
    createSeededChat,
};
