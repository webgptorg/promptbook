import { string_book } from '@promptbook-local/types';
import { serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../../src/errors/assertsError';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';

/**
 * JSON payload accepted by the history restore endpoint.
 */
type RestoreAgentHistoryRequestBody = {
    historyId?: number;
};

/**
 * GET `/agents/[agentName]/api/book/history`
 *
 * Returns source snapshots ordered from newest to oldest.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    try {
        const { agentName: rawAgentName } = await params;
        const agentName = decodeURIComponent(rawAgentName);
        const collection = await $provideAgentCollectionForServer();
        const permanentId = await collection.getAgentPermanentId(agentName);
        const history = await collection.listAgentHistorySnapshots(permanentId);

        return new Response(JSON.stringify({ history }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        assertsError(error);
        console.error(error);

        return new Response(JSON.stringify(serializeError(error), null, 4), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

/**
 * POST `/agents/[agentName]/api/book/history`
 *
 * Restores one source snapshot by history id for the current agent.
 */
export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    try {
        const { agentName: rawAgentName } = await params;
        const agentName = decodeURIComponent(rawAgentName);
        const collection = await $provideAgentCollectionForServer();
        const permanentId = await collection.getAgentPermanentId(agentName);
        const requestBody = (await request.json()) as RestoreAgentHistoryRequestBody;
        const historyId = Number(requestBody.historyId);

        if (!Number.isInteger(historyId) || historyId <= 0) {
            throw new Error('History id must be a positive integer.');
        }

        await collection.restoreAgentFromHistory(historyId, permanentId);
        const agentSource = (await collection.getAgentSource(permanentId)) as string_book;

        return new Response(
            JSON.stringify({
                isSuccessful: true,
                agentSource,
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            },
        );
    } catch (error) {
        assertsError(error);
        console.error(error);

        return new Response(JSON.stringify(serializeError(error), null, 4), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
