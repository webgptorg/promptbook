/**
 * API token entry returned by the Agents Server API.
 */
export type ApiTokenEntry = {
    id: number;
    token: string;
    note: string | null;
    createdAt: string;
    updatedAt: string;
    isRevoked: boolean;
};

/**
 * Reads a human-friendly error message from an API response.
 */
async function readApiTokensError(response: Response, fallbackMessage: string): Promise<string> {
    try {
        const payload = (await response.json()) as { error?: string };
        if (payload && typeof payload.error === 'string') {
            return payload.error;
        }
    } catch (error) {
        return fallbackMessage;
    }

    return fallbackMessage;
}

/**
 * Fetches all API tokens for the current admin user.
 */
export async function fetchApiTokens(): Promise<ApiTokenEntry[]> {
    const response = await fetch('/api/api-tokens');

    if (!response.ok) {
        throw new Error(await readApiTokensError(response, 'Failed to fetch tokens'));
    }

    return (await response.json()) as ApiTokenEntry[];
}

/**
 * Creates a new API token with an optional note.
 */
export async function createApiToken(note?: string): Promise<ApiTokenEntry> {
    const response = await fetch('/api/api-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
    });

    if (!response.ok) {
        throw new Error(await readApiTokensError(response, 'Failed to create token'));
    }

    return (await response.json()) as ApiTokenEntry;
}

/**
 * Deletes an API token by its identifier.
 */
export async function deleteApiToken(id: number): Promise<void> {
    const response = await fetch(`/api/api-tokens?id=${id}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error(await readApiTokensError(response, 'Failed to delete token'));
    }
}
