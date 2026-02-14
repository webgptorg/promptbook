import { $generateBookBoilerplate, normalizeAgentName, NotFoundError } from '@promptbook-local/core';
import { string_agent_name, string_agent_permanent_id } from '@promptbook-local/types';
import { serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../../src/errors/assertsError';
import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { isUserAdmin } from '@/src/utils/isUserAdmin';

/**
 * Request payload accepted by the team member creation endpoint.
 */
type TeamMemberCreationRequest = {
    readonly name?: string;
};

/**
 * Creates a missing TEAM teammate so admins can instantly onboard unresolved teammates from the Book editor.
 */
export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    try {
        if (!(await isUserAdmin())) {
            throw new Error('You are not authorized to create agents');
        }

        const payload = (await request.json()) as TeamMemberCreationRequest;
        const candidate = (payload?.name ?? '').trim();
        if (!candidate) {
            throw new Error('Team member name is required');
        }

        const normalizedCandidate = normalizeAgentName(candidate);
        const collection = await $provideAgentCollectionForServer();

        let existingPermanentId: string_agent_permanent_id | null = null;
        try {
            existingPermanentId = await collection.getAgentPermanentId(normalizedCandidate as string_agent_name);
        } catch (error) {
            if (!(error instanceof NotFoundError)) {
                throw error;
            }
        }

        if (existingPermanentId) {
            return new Response(
                JSON.stringify({
                    isSuccessful: true,
                    alreadyExists: true,
                    agentName: normalizedCandidate,
                    permanentId: existingPermanentId,
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        const supabase = $provideSupabaseForServer();
        const agentTable = await $getTableName('Agent');
        const folderResult = await supabase
            .from(agentTable)
            .select('folderId')
            .or(`agentName.eq.${agentName},permanentId.eq.${agentName}`)
            .limit(1);

        const folderId =
            Array.isArray(folderResult.data) && folderResult.data.length > 0
                ? (folderResult.data[0] as { folderId: number | null }).folderId
                : null;

        const agentSource = $generateBookBoilerplate({ agentName: candidate });
        const newAgent = await collection.createAgent(agentSource, {
            folderId,
        });

        return new Response(
            JSON.stringify({
                isSuccessful: true,
                alreadyExists: false,
                agentName: newAgent.agentName,
                permanentId: newAgent.permanentId,
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            },
        );
    } catch (error) {
        assertsError(error);

        console.error('Error creating team member:', error);

        return new Response(
            JSON.stringify(
                serializeError(error),
                null,
                4,
            ),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            },
        );
    }
}
