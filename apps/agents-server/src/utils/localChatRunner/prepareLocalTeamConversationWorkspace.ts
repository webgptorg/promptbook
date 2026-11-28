import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { mkdir, rm, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import type { string_agent_url } from '../../../../../src/types/typeAliases';
import {
    AGENT_TEAM_CONVERSATION_MANIFEST_FILE_NAME,
    AGENT_TEAMMATE_SOURCES_DIRECTORY_NAME,
    createAgentTeamConversationWorkspacePath,
    createAgentTeamTeammateSourceFileName,
    type AgentTeamConversationTeammate,
    type AgentTeamConversationWorkspaceManifest,
} from '../../../../../src/book-3.0/AgentTeamConversationWorkspace';
import {
    resolveCachedServerAgentContext,
    resolveCachedServerAgentModelRequirements,
} from '../cachedServerAgentRuntime';
import { createServerAgentReferenceResolver } from '../agentReferenceResolver/createServerAgentReferenceResolver';
import { normalizeLocalServerUrls, resolveLocalAgentRouteReference } from '../localAgentRouteReferences';
import { resolveCurrentOrInternalServerOrigin } from '../resolveCurrentOrInternalServerOrigin';
import type { UserChatJobRecord } from '../userChat/UserChatJobRecord';
import type { LocalAgentFolder } from './ensureLocalAgentFolder';
import type { LocalUserChatJobMetadata } from './LocalUserChatJobMetadata';

/**
 * Resolves local TEAM members and snapshots their sources for one local coding-harness job.
 */
export async function prepareLocalTeamConversationWorkspace(options: {
    readonly job: Pick<UserChatJobRecord, 'agentPermanentId'>;
    readonly agentFolder: LocalAgentFolder;
    readonly metadata: LocalUserChatJobMetadata;
    readonly primaryAgentName: string;
}): Promise<void> {
    const workspacePath = join(
        options.agentFolder.directoryPath,
        createAgentTeamConversationWorkspacePath(options.metadata.fileName),
    );
    const manifestPath = join(workspacePath, AGENT_TEAM_CONVERSATION_MANIFEST_FILE_NAME);

    if (await isExistingPath(manifestPath)) {
        return;
    }

    const localServerUrl = await resolveCurrentOrInternalServerOrigin();
    const collection = await $provideAgentCollectionForServer();
    const agentReferenceResolver = await createServerAgentReferenceResolver({
        agentCollection: collection,
        localServerUrl,
    });
    const primaryAgentContext = await resolveCachedServerAgentContext({
        collection,
        agentIdentifier: options.job.agentPermanentId,
        localServerUrl,
        fallbackResolver: agentReferenceResolver,
    });
    const preparedRequirements = await resolveCachedServerAgentModelRequirements({
        resolvedAgentContext: primaryAgentContext,
        localServerUrl,
        fallbackResolver: agentReferenceResolver,
    });
    const teammates = await resolveLocalTeamConversationTeammates({
        teammates: getPreparedTeamMetadata(preparedRequirements.modelRequirements._metadata?.teammates),
        collection,
        localServerUrl,
        primaryAgentPermanentId: options.job.agentPermanentId,
        agentReferenceResolver,
    });

    if (teammates.length === 0) {
        return;
    }

    const manifest: AgentTeamConversationWorkspaceManifest = {
        version: 1,
        primaryAgent: {
            permanentId: options.job.agentPermanentId,
            agentName: options.primaryAgentName,
        },
        teammates: teammates.map(({ teammate }) => teammate),
    };

    // Note: The path is deterministically derived from this one queued message, so clearing a stale
    //       incomplete workspace cannot affect another user turn.
    await rm(workspacePath, { recursive: true, force: true });
    await mkdir(join(workspacePath, AGENT_TEAMMATE_SOURCES_DIRECTORY_NAME), { recursive: true });
    await Promise.all([
        writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8'),
        ...teammates.map(({ teammate, source }) =>
            writeFile(
                join(workspacePath, AGENT_TEAMMATE_SOURCES_DIRECTORY_NAME, teammate.sourceFileName),
                ensureTrailingNewline(source),
                'utf-8',
            ),
        ),
    ]);
}

/**
 * TEAM metadata retained by the TEAM commitment while building model requirements.
 */
type PreparedTeamMetadata = {
    readonly url: string;
    readonly label?: string;
    readonly instructions?: string;
};

/**
 * One workspace teammate paired with its resolved read-only source.
 */
type LocalTeamConversationTeammate = {
    readonly teammate: AgentTeamConversationTeammate;
    readonly source: string;
};

/**
 * Extracts valid TEAM metadata from untyped commitment metadata.
 */
function getPreparedTeamMetadata(value: unknown): Array<PreparedTeamMetadata> {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter(isPreparedTeamMetadata);
}

/**
 * Checks one TEAM metadata item from `AgentModelRequirements._metadata`.
 */
function isPreparedTeamMetadata(value: unknown): value is PreparedTeamMetadata {
    return Boolean(value && typeof value === 'object' && typeof (value as PreparedTeamMetadata).url === 'string');
}

/**
 * Resolves only teammates hosted by this Agents Server, because only their durable histories can be persisted here.
 */
async function resolveLocalTeamConversationTeammates(options: {
    readonly teammates: ReadonlyArray<PreparedTeamMetadata>;
    readonly collection: Awaited<ReturnType<typeof $provideAgentCollectionForServer>>;
    readonly localServerUrl: string;
    readonly primaryAgentPermanentId: string;
    readonly agentReferenceResolver: Awaited<ReturnType<typeof createServerAgentReferenceResolver>>;
}): Promise<Array<LocalTeamConversationTeammate>> {
    const localServerUrls = normalizeLocalServerUrls([options.localServerUrl]);
    const seenPermanentIds = new Set<string>();
    const resolvedTeammates: Array<LocalTeamConversationTeammate> = [];

    for (const preparedTeammate of options.teammates) {
        const routeReference = resolveLocalAgentRouteReference(
            preparedTeammate.url as string_agent_url,
            localServerUrls,
            [],
        );
        if (!routeReference) {
            continue;
        }

        const basicInformation = await options.collection.findAgentBasicInformation(routeReference.agentIdentifier);
        const teammatePermanentId = basicInformation?.permanentId;
        if (
            !teammatePermanentId ||
            isSamePermanentId(teammatePermanentId, options.primaryAgentPermanentId) ||
            seenPermanentIds.has(teammatePermanentId)
        ) {
            continue;
        }

        const teammateContext = await resolveCachedServerAgentContext({
            collection: options.collection,
            agentIdentifier: teammatePermanentId,
            localServerUrl: options.localServerUrl,
            fallbackResolver: options.agentReferenceResolver,
        });
        const teammateName = preparedTeammate.label?.trim() || teammateContext.resolvedAgentName;
        if (!teammateName) {
            continue;
        }

        seenPermanentIds.add(teammatePermanentId);
        resolvedTeammates.push({
            teammate: {
                permanentId: teammatePermanentId,
                agentName: teammateName,
                url: preparedTeammate.url,
                instructions: preparedTeammate.instructions?.trim() || '',
                sourceFileName: createAgentTeamTeammateSourceFileName(teammatePermanentId),
            },
            source: teammateContext.resolvedAgentSource,
        });
    }

    return resolvedTeammates;
}

/**
 * Compares permanent ids case-insensitively, matching Agents Server routing semantics.
 */
function isSamePermanentId(firstPermanentId: string, secondPermanentId: string): boolean {
    return firstPermanentId.toLowerCase() === secondPermanentId.toLowerCase();
}

/**
 * Keeps source snapshots friendly to the Book parser and coding harness.
 */
function ensureTrailingNewline(source: string): string {
    return source.endsWith('\n') ? source : `${source}\n`;
}

/**
 * Checks whether a fixed per-message workspace manifest already exists.
 */
async function isExistingPath(path: string): Promise<boolean> {
    try {
        await stat(path);
        return true;
    } catch (error) {
        if (isFileNotFoundError(error)) {
            return false;
        }

        throw error;
    }
}

/**
 * Returns true when one filesystem error indicates a missing path.
 */
function isFileNotFoundError(error: unknown): boolean {
    return Boolean(
        error &&
            typeof error === 'object' &&
            'code' in error &&
            ((error as { code?: string }).code === 'ENOENT' || (error as { code?: string }).code === 'ENOTDIR'),
    );
}
