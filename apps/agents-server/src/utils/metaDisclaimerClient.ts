'use client';

/**
 * Disclaimer status payload returned by Agents Server API.
 */
export type MetaDisclaimerStatus = {
    enabled: boolean;
    accepted: boolean;
    markdown: string | null;
};

/**
 * Reads current META DISCLAIMER status for one agent.
 */
export async function fetchMetaDisclaimerStatus(agentName: string): Promise<MetaDisclaimerStatus> {
    const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/meta-disclaimer`, {
        method: 'GET',
        cache: 'no-store',
    });

    return parseMetaDisclaimerStatusResponse(response, 'Failed to load disclaimer status.');
}

/**
 * Stores acceptance for META DISCLAIMER of one agent.
 */
export async function acceptMetaDisclaimer(agentName: string): Promise<MetaDisclaimerStatus> {
    const response = await fetch(`/agents/${encodeURIComponent(agentName)}/api/meta-disclaimer`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    });

    return parseMetaDisclaimerStatusResponse(response, 'Failed to accept disclaimer.');
}

/**
 * Parses one API response and returns normalized disclaimer status.
 */
async function parseMetaDisclaimerStatusResponse(
    response: Response,
    fallbackErrorMessage: string,
): Promise<MetaDisclaimerStatus> {
    const payload = (await response.json().catch(() => ({}))) as
        | Partial<MetaDisclaimerStatus> & { error?: string }
        | undefined;

    if (!response.ok) {
        throw new Error(payload?.error || fallbackErrorMessage);
    }

    return {
        enabled: payload?.enabled === true,
        accepted: payload?.accepted === true,
        markdown: typeof payload?.markdown === 'string' ? payload.markdown : null,
    };
}

