import { createAgentModelRequirements } from '../../../../../src/book-2.0/agent-source/createAgentModelRequirements';
import { parseAgentSource } from '../../../../../src/book-2.0/agent-source/parseAgentSource';
import { resolvePseudoAgentKindFromUrl } from '../../../../../src/book-2.0/agent-source/pseudoAgentReferences';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { promptbookFetch } from '../../../../../src/scrapers/_common/utils/promptbookFetch';
import type { TranspiledTeamMember } from '../../../../../src/transpilers/_common/TranspiledTeamMember';

/**
 * TEAM hierarchy exported into transpiled code.
 */
export type ResolveTranspiledAgentTeamHierarchyOptions = {
    /**
     * Fully resolved agent source used as the starting point for hierarchy traversal.
     */
    readonly agentSource: string_book;
};

/**
 * Parsed teammate metadata used while recursively traversing the hierarchy.
 */
type TranspiledAgentTeamMetadataTeammate = {
    readonly url: string;
    readonly toolName: string;
    readonly label?: string;
    readonly instructions?: string;
};

/**
 * Pre-resolved teammate profile cached in agent model requirements metadata.
 */
type TranspiledAgentTeamProfile = {
    readonly agentName: string;
    readonly personaDescription: string | null;
};

/**
 * Lightweight snapshot of one teammate agent loaded from `/api/book`.
 */
type TranspiledAgentSnapshot = {
    readonly agentSource: string_book;
    readonly agentName: string;
    readonly personaDescription: string | null;
};

/**
 * Resolves the full TEAM hierarchy for one agent source.
 *
 * The resolver reuses the existing Book parser and model-requirements compiler so direct TEAM
 * tool metadata stays aligned with the runtime source of truth.
 *
 * @param options - Root agent source used as the hierarchy entry point.
 * @returns Recursive TEAM hierarchy ready to be embedded in transpiled code.
 */
export async function resolveTranspiledAgentTeamHierarchy(
    options: ResolveTranspiledAgentTeamHierarchyOptions,
): Promise<Array<TranspiledTeamMember>> {
    const snapshotCache = new Map<string, Promise<TranspiledAgentSnapshot | null>>();
    const teamMemberCache = new Map<string, Promise<TranspiledTeamMember | null>>();

    return resolveTranspiledTeamMembersFromAgentSource(
        options.agentSource,
        snapshotCache,
        teamMemberCache,
        new Set<string>(),
    );
}

/**
 * Resolves one source into a recursive list of transpiled team members.
 *
 * @param agentSource - Book source whose TEAM commitments should be traversed.
 * @param snapshotCache - Shared source snapshot cache.
 * @param teamMemberCache - Shared recursive team-member cache.
 * @param seenTeamMemberUrls - URL deduplication set preventing recursive loops.
 * @returns Recursive TEAM hierarchy for the provided source.
 */
async function resolveTranspiledTeamMembersFromAgentSource(
    agentSource: string_book,
    snapshotCache: Map<string, Promise<TranspiledAgentSnapshot | null>>,
    teamMemberCache: Map<string, Promise<TranspiledTeamMember | null>>,
    seenTeamMemberUrls: Set<string>,
): Promise<Array<TranspiledTeamMember>> {
    const modelRequirements = await createAgentModelRequirements(agentSource, undefined, undefined, undefined, {
        teammateProfileResolver: {
            resolveTeammateProfile: async (url: string): Promise<TranspiledAgentProfile | null> => {
                const snapshot = await resolveTranspiledAgentSnapshot(url, snapshotCache);
                if (!snapshot) {
                    return null;
                }

                return {
                    agentName: snapshot.agentName,
                    personaDescription: snapshot.personaDescription,
                };
            },
        },
    });

    return resolveTranspiledTeamMembersFromModelRequirements(
        modelRequirements._metadata,
        snapshotCache,
        teamMemberCache,
        seenTeamMemberUrls,
    );
}

/**
 * Resolves the direct TEAM members from one compiled model-requirements snapshot.
 *
 * @param metadata - Compiled requirements metadata produced by the TEAM commitment pipeline.
 * @param snapshotCache - Shared source snapshot cache.
 * @param teamMemberCache - Shared recursive team-member cache.
 * @param seenTeamMemberUrls - URL deduplication set preventing recursive loops.
 * @returns Direct TEAM members with nested children baked in.
 */
async function resolveTranspiledTeamMembersFromModelRequirements(
    metadata: Record<string, unknown> | undefined,
    snapshotCache: Map<string, Promise<TranspiledAgentSnapshot | null>>,
    teamMemberCache: Map<string, Promise<TranspiledTeamMember | null>>,
    seenTeamMemberUrls: Set<string>,
): Promise<Array<TranspiledTeamMember>> {
    const teammates = Array.isArray(metadata?.teammates) ? (metadata.teammates as Array<TranspiledAgentTeamMetadataTeammate>) : [];
    const teamMembers: Array<TranspiledTeamMember> = [];

    for (const teammate of teammates) {
        const normalizedTeamMemberUrl = normalizeTranspiledAgentUrl(teammate.url);
        if (!normalizedTeamMemberUrl || seenTeamMemberUrls.has(normalizedTeamMemberUrl)) {
            continue;
        }

        seenTeamMemberUrls.add(normalizedTeamMemberUrl);
        const teamMember = await resolveTranspiledTeamMember(
            {
                ...teammate,
                url: normalizedTeamMemberUrl,
            },
            snapshotCache,
            teamMemberCache,
            seenTeamMemberUrls,
        );

        if (teamMember) {
            teamMembers.push(teamMember);
        }
    }

    return teamMembers;
}

/**
 * Resolves one teammate node including its nested descendants.
 *
 * @param teammate - Direct teammate descriptor from a compiled TEAM commitment.
 * @param snapshotCache - Shared source snapshot cache.
 * @param teamMemberCache - Shared recursive team-member cache.
 * @param seenTeamMemberUrls - URL deduplication set preventing recursive loops.
 * @returns Recursive teammate node or `null` when the teammate cannot be materialized.
 */
async function resolveTranspiledTeamMember(
    teammate: TranspiledAgentTeamMetadataTeammate,
    snapshotCache: Map<string, Promise<TranspiledAgentSnapshot | null>>,
    teamMemberCache: Map<string, Promise<TranspiledTeamMember | null>>,
    seenTeamMemberUrls: Set<string>,
): Promise<TranspiledTeamMember | null> {
    const cachedTeamMember = teamMemberCache.get(teammate.url);
    if (cachedTeamMember) {
        return cachedTeamMember;
    }

    const pendingTeamMember = (async (): Promise<TranspiledTeamMember | null> => {
        const snapshot = await resolveTranspiledAgentSnapshot(teammate.url, snapshotCache);
        const nestedTeamMembers = snapshot
            ? await resolveTranspiledTeamMembersFromAgentSource(
                  snapshot.agentSource,
                  snapshotCache,
                  teamMemberCache,
                  seenTeamMemberUrls,
              )
            : [];
        const pseudoAgentKind = resolvePseudoAgentKindFromUrl(teammate.url) || undefined;

        return {
            agentName: snapshot?.agentName || teammate.label || teammate.url,
            label: teammate.label || snapshot?.agentName || teammate.url,
            url: teammate.url,
            toolName: teammate.toolName,
            instructions: teammate.instructions || '',
            personaDescription: snapshot?.personaDescription ?? null,
            ...(pseudoAgentKind ? { pseudoAgentKind } : {}),
            teamMembers: nestedTeamMembers,
        };
    })();

    teamMemberCache.set(teammate.url, pendingTeamMember);

    try {
        return await pendingTeamMember;
    } catch (error) {
        teamMemberCache.delete(teammate.url);
        throw error;
    }
}

/**
 * Loads and parses one teammate source snapshot from `/api/book`.
 *
 * @param agentUrl - Canonical teammate URL.
 * @param snapshotCache - Shared source snapshot cache.
 * @returns Loaded teammate snapshot or `null` when the remote source cannot be read.
 */
async function resolveTranspiledAgentSnapshot(
    agentUrl: string,
    snapshotCache: Map<string, Promise<TranspiledAgentSnapshot | null>>,
): Promise<TranspiledAgentSnapshot | null> {
    const normalizedAgentUrl = normalizeTranspiledAgentUrl(agentUrl);
    if (!normalizedAgentUrl || resolvePseudoAgentKindFromUrl(normalizedAgentUrl)) {
        return null;
    }

    const cachedSnapshot = snapshotCache.get(normalizedAgentUrl);
    if (cachedSnapshot) {
        return cachedSnapshot;
    }

    const pendingSnapshot = (async (): Promise<TranspiledAgentSnapshot | null> => {
        try {
            const response = await promptbookFetch(createTranspiledAgentBookUrl(normalizedAgentUrl), {
                cache: 'no-store',
            });

            if (!response.ok) {
                return null;
            }

            const agentSource = (await response.text()) as string_book;
            const parsedAgentSource = parseAgentSource(agentSource);

            return {
                agentSource,
                agentName: parsedAgentSource.agentName || resolveAgentNameFromUrl(normalizedAgentUrl),
                personaDescription: parsedAgentSource.personaDescription,
            };
        } catch {
            return null;
        }
    })();

    snapshotCache.set(normalizedAgentUrl, pendingSnapshot);

    try {
        return await pendingSnapshot;
    } catch (error) {
        snapshotCache.delete(normalizedAgentUrl);
        throw error;
    }
}

/**
 * Normalizes one agent URL for cache keys and recursive traversal.
 *
 * @param agentUrl - Raw agent URL or `/api/book` URL.
 * @returns Canonical agent route without query/hash and without the `/api/book` suffix.
 */
function normalizeTranspiledAgentUrl(agentUrl: string): string {
    const trimmedAgentUrl = agentUrl.trim();
    if (!trimmedAgentUrl) {
        return '';
    }

    try {
        const routeUrl = new URL(trimmedAgentUrl);
        routeUrl.hash = '';
        routeUrl.search = '';
        routeUrl.pathname = routeUrl.pathname.replace(/\/api\/book\/?$/g, '').replace(/\/+$/g, '');
        return routeUrl.href;
    } catch {
        return trimmedAgentUrl.replace(/\/api\/book\/?$/g, '').replace(/\/+$/g, '');
    }
}

/**
 * Builds the `/api/book` endpoint URL used to load one teammate snapshot.
 *
 * @param agentUrl - Canonical teammate URL.
 * @returns Absolute `/api/book` URL with the recursion guard used by the existing book route.
 */
function createTranspiledAgentBookUrl(agentUrl: string): string {
    const routeUrl = new URL(agentUrl);
    routeUrl.search = '';
    routeUrl.hash = '';
    routeUrl.pathname = `${routeUrl.pathname.replace(/\/+$/g, '')}/api/book`;
    routeUrl.searchParams.set('recursionLevel', '1');
    return routeUrl.href;
}

/**
 * Resolves a fallback name from an agent URL when the source does not yield one.
 *
 * @param agentUrl - Canonical agent URL.
 * @returns Human-readable fallback agent name.
 */
function resolveAgentNameFromUrl(agentUrl: string): string {
    const pathSegment = agentUrl.split('/').filter(Boolean).pop() || '';
    const decodedPathSegment = decodeURIComponent(pathSegment);
    const spacedPathSegment = decodedPathSegment.replace(/[-_]+/g, ' ').trim();

    return spacedPathSegment || agentUrl;
}

/**
 * Agent profile extracted from a teammate snapshot.
 */
type TranspiledAgentProfile = {
    readonly agentName: string;
    readonly personaDescription: string | null;
};
