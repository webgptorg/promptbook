import { $generateBookBoilerplate, normalizeAgentName } from '@promptbook-local/core';
import { string_agent_permanent_id } from '@promptbook-local/types';
import { serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../../../../../src/errors/assertsError';
import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';
import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $invalidateProvidedAgentReferenceResolverCache } from '@/src/utils/agentReferenceResolver/$provideAgentReferenceResolver';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { buildAgentNameOrIdFilter } from '@/src/utils/agentIdentifier';
import { createAgentWithDefaultVisibility } from '@/src/utils/createAgentWithDefaultVisibility';

/**
 * Request payload accepted by the referenced agent creation endpoint.
 */
type ReferencedAgentCreationRequest = {
    readonly name?: string;
};

/**
 * Minimal identity payload returned for an already existing active agent.
 */
type ExistingAgentIdentity = {
    readonly agentName: string;
    readonly permanentId: string_agent_permanent_id;
};

/**
 * Creates a missing referenced agent so admins can instantly onboard unresolved references from the Book editor.
 */
export async function POST(request: Request, { params }: { params: Promise<{ agentName: string }> }) {
    let { agentName } = await params;
    agentName = decodeURIComponent(agentName);

    try {
        if (!(await isUserAdmin())) {
            throw new Error('You are not authorized to create agents');
        }

        const payload = (await request.json()) as ReferencedAgentCreationRequest;
        const candidate = (payload?.name ?? '').trim();
        if (!candidate) {
            throw new Error('Referenced agent name is required');
        }

        const normalizedCandidate = normalizeAgentName(candidate);
        const collection = await $provideAgentCollectionForServer();
        const existingAgentIdentity = await findExistingActiveAgentIdentity(collection, candidate, normalizedCandidate);

        if (existingAgentIdentity) {
            $invalidateProvidedAgentReferenceResolverCache();
            return new Response(
                JSON.stringify({
                    isSuccessful: true,
                    alreadyExists: true,
                    agentName: existingAgentIdentity.agentName,
                    permanentId: existingAgentIdentity.permanentId,
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        const deletedAgentIdentity = await findExistingDeletedAgentIdentity(collection, candidate, normalizedCandidate);
        if (deletedAgentIdentity) {
            await collection.restoreAgent(deletedAgentIdentity.permanentId);
            $invalidateProvidedAgentReferenceResolverCache();

            return new Response(
                JSON.stringify({
                    isSuccessful: true,
                    alreadyExists: true,
                    restored: true,
                    agentName: deletedAgentIdentity.agentName,
                    permanentId: deletedAgentIdentity.permanentId,
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }

        const supabase = $provideSupabaseForServer();
        const agentTable = await $getTableName('Agent');
        const agentFilter = buildAgentNameOrIdFilter(agentName);
        const folderResult = await supabase
            .from(agentTable)
            .select('folderId')
            .or(agentFilter)
            .is('deletedAt', null)
            .limit(1);

        const folderId =
            Array.isArray(folderResult.data) && folderResult.data.length > 0
                ? (folderResult.data[0] as { folderId: number | null }).folderId
                : null;

        const agentSource = $generateBookBoilerplate({ agentName: candidate });
        const newAgent = await createAgentWithDefaultVisibility(collection, agentSource, {
            folderId,
        });
        $invalidateProvidedAgentReferenceResolverCache();

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

        console.error('Error creating referenced agent:', error);

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

/**
 * Finds an existing active referenced agent while ignoring soft-deleted entries.
 *
 * `getAgentPermanentId()` includes soft-deleted rows, which causes false positives for this endpoint.
 *
 * @param collection - Server agent collection.
 * @param candidate - Raw referenced agent name entered by the user.
 * @param normalizedCandidate - Normalized candidate name used by resolver matching.
 * @returns Existing active identity or `null` when no active match exists.
 */
async function findExistingActiveAgentIdentity(
    collection: Awaited<ReturnType<typeof $provideAgentCollectionForServer>>,
    candidate: string,
    normalizedCandidate: string,
): Promise<ExistingAgentIdentity | null> {
    const listedAgents = await collection.listAgents();
    return findMatchingAgentIdentity(listedAgents, candidate, normalizedCandidate);
}

/**
 * Finds an existing soft-deleted referenced agent candidate.
 *
 * @param collection - Server agent collection.
 * @param candidate - Raw referenced agent name entered by the user.
 * @param normalizedCandidate - Normalized candidate name used by resolver matching.
 * @returns Matching soft-deleted identity or `null`.
 */
async function findExistingDeletedAgentIdentity(
    collection: Awaited<ReturnType<typeof $provideAgentCollectionForServer>>,
    candidate: string,
    normalizedCandidate: string,
): Promise<ExistingAgentIdentity | null> {
    const deletedAgents = await collection.listDeletedAgents();
    return findMatchingAgentIdentity(deletedAgents, candidate, normalizedCandidate);
}

/**
 * Matches a referenced agent candidate against listed agents by normalized name, exact name, or permanent ID.
 *
 * @param listedAgents - Candidate agents to search in.
 * @param candidate - Raw referenced agent name entered by the user.
 * @param normalizedCandidate - Normalized candidate name used by resolver matching.
 * @returns Matching identity or `null`.
 */
function findMatchingAgentIdentity(
    listedAgents: ReadonlyArray<{ agentName: string; permanentId?: string_agent_permanent_id }>,
    candidate: string,
    normalizedCandidate: string,
): ExistingAgentIdentity | null {
    for (const listedAgent of listedAgents) {
        const listedAgentPermanentId = listedAgent.permanentId;
        if (!listedAgentPermanentId) {
            continue;
        }

        const listedNormalizedName = normalizeAgentName(listedAgent.agentName);
        if (
            listedNormalizedName === normalizedCandidate ||
            listedAgent.agentName === candidate ||
            listedAgentPermanentId === candidate
        ) {
            return {
                agentName: listedAgent.agentName,
                permanentId: listedAgentPermanentId,
            };
        }
    }

    return null;
}
