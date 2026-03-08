/**
 * Browser-safe wrapper for spawning one persisted Agents Server agent.
 *
 * This function proxies requests to the Agents Server `/api/spawn-agent` endpoint.
 *
 * @param args Tool payload forwarded to server-side `spawn_agent` tool.
 * @param agentsServerUrl Optional explicit agents server base URL.
 * @returns JSON string with structured spawn result.
 *
 * @private internal utility for USE SPAWN commitment
 */
export async function spawnAgentViaBrowser(
    args: Record<string, unknown>,
    agentsServerUrl?: string,
): Promise<string> {
    try {
        const baseUrl = agentsServerUrl || (typeof window !== 'undefined' ? window.location.origin : '');

        if (!baseUrl) {
            throw new Error('Agents server URL is required in non-browser environments');
        }

        const apiUrl = new URL('/api/spawn-agent', baseUrl);

        const response = await fetch(apiUrl.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(args),
        });

        const payload = (await response.json().catch(() => ({}))) as {
            success?: boolean;
            result?: unknown;
            error?: unknown;
        };

        if (payload.result !== undefined) {
            return typeof payload.result === 'string' ? payload.result : JSON.stringify(payload.result);
        }

        if (!response.ok || payload.success === false) {
            throw new Error(
                `Failed to spawn agent: ${typeof payload.error === 'string' ? payload.error : response.statusText}`,
            );
        }
        return JSON.stringify(payload);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Error spawning agent via browser: ${errorMessage}`);
    }
}
