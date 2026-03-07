import { defaultServerSearchProviderConfig } from './defaultServerSearchProviderConfig';

/**
 * Parsed federated-agent shape returned by remote `/api/agents` endpoints.
 *
 * @private function of createDefaultServerSearchProviders
 */
export type FederatedAgentSearchRow = {
    agentName: string;
    permanentId?: string | null;
    personaDescription?: string;
    meta?: {
        fullname?: string;
        description?: string;
    };
    url?: string;
};

/**
 * Fetches and validates one remote `/api/agents` payload.
 *
 * @param serverUrl Remote server URL.
 * @returns Normalized agents list or `null` on fetch/validation failure.
 * @private function of createDefaultServerSearchProviders
 */
export async function fetchFederatedAgentsPayload(serverUrl: string): Promise<ReadonlyArray<FederatedAgentSearchRow> | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), defaultServerSearchProviderConfig.federatedFetchTimeoutMs);

    try {
        const response = await fetch(`${serverUrl}/api/agents`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            cache: 'no-store',
            signal: controller.signal,
        });

        if (!response.ok) {
            return null;
        }

        const payload = (await response.json()) as { agents?: unknown };
        if (!Array.isArray(payload.agents)) {
            return null;
        }

        const normalizedAgents: FederatedAgentSearchRow[] = [];
        for (const rawAgent of payload.agents.slice(0, defaultServerSearchProviderConfig.federatedAgentsPerServerLimit)) {
            if (!rawAgent || typeof rawAgent !== 'object') {
                continue;
            }

            const maybeAgentName = (rawAgent as { agentName?: unknown }).agentName;
            if (typeof maybeAgentName !== 'string' || maybeAgentName.trim().length === 0) {
                continue;
            }

            normalizedAgents.push({
                agentName: maybeAgentName,
                permanentId:
                    typeof (rawAgent as { permanentId?: unknown }).permanentId === 'string'
                        ? (rawAgent as { permanentId: string }).permanentId
                        : null,
                personaDescription:
                    typeof (rawAgent as { personaDescription?: unknown }).personaDescription === 'string'
                        ? (rawAgent as { personaDescription: string }).personaDescription
                        : undefined,
                meta:
                    (rawAgent as { meta?: unknown }).meta && typeof (rawAgent as { meta?: unknown }).meta === 'object'
                        ? ((rawAgent as { meta: FederatedAgentSearchRow['meta'] }).meta || undefined)
                        : undefined,
                url:
                    typeof (rawAgent as { url?: unknown }).url === 'string'
                        ? (rawAgent as { url: string }).url
                        : undefined,
            });
        }

        return normalizedAgents;
    } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError') {
            console.error(`[search] Failed to fetch federated agents from ${serverUrl}:`, error);
        }
        return null;
    } finally {
        clearTimeout(timeout);
    }
}
