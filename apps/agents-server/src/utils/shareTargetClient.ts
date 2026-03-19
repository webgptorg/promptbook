'use client';

/**
 * Marks one pending Android share-target payload as consumed from the browser.
 */
export async function consumeShareTargetPayloadFromBrowser(
    agentName: string,
    shareTargetId: string,
): Promise<void> {
    const response = await fetch(
        `/agents/${encodeURIComponent(agentName)}/api/share-target/${encodeURIComponent(shareTargetId)}/consume`,
        {
            method: 'POST',
        },
    );

    if (!response.ok) {
        throw new Error('Failed to consume the pending Android share-target payload.');
    }
}
