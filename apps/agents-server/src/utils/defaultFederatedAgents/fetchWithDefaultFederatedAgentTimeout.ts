/**
 * Timeout used for remote Core HTTP requests.
 */
const DEFAULT_FEDERATED_AGENT_FETCH_TIMEOUT_MS = 10_000;

/**
 * Executes one HTTP request with a fixed abort timeout.
 *
 * @param url - Absolute request URL.
 * @returns Successful or unsuccessful fetch response.
 *
 * @private internal utility of `scheduleDefaultFederatedAgentsSync`
 */
export async function fetchWithDefaultFederatedAgentTimeout(url: string): Promise<Response> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), DEFAULT_FEDERATED_AGENT_FETCH_TIMEOUT_MS);

    try {
        return await fetch(url, {
            method: 'GET',
            cache: 'no-store',
            headers: { Accept: 'application/json, text/plain;q=0.9, */*;q=0.1' },
            signal: abortController.signal,
        });
    } finally {
        clearTimeout(timeout);
    }
}
