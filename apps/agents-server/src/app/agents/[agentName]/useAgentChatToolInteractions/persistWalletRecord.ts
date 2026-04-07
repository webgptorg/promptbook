import type { WalletRecordDialogSubmitPayload } from '@/src/components/WalletRecordDialog/WalletRecordDialog';

/**
 * Persists one wallet record using the Agents Server wallet API.
 *
 * @private function of useAgentChatToolInteractions
 */
export async function persistWalletRecord(
    payload: WalletRecordDialogSubmitPayload,
    currentAgentPermanentId: string | undefined,
): Promise<void> {
    const shouldScopeToAgent = !payload.isGlobal && Boolean(currentAgentPermanentId);
    const isGlobal = !shouldScopeToAgent;

    const response = await fetch('/api/user-wallet', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            recordType: payload.recordType,
            service: payload.service,
            key: payload.key,
            username: payload.username,
            password: payload.password,
            secret: payload.secret,
            cookies: payload.cookies,
            jsonSchema: payload.jsonSchema,
            isUserScoped: payload.isUserScoped === true,
            isGlobal,
            agentPermanentId: shouldScopeToAgent ? currentAgentPermanentId : null,
        }),
    });

    if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error || 'Failed to store wallet record.');
    }
}
