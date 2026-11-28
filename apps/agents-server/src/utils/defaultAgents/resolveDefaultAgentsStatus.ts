import type { AgentBasicInformation } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { prepareAgentSourceForPersistence } from '../../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/prepareAgentSourceForPersistence';
import { $provideAgentCollectionForServer } from '../../tools/$provideAgentCollectionForServer';
import { resolveCoreAgentExplanation } from './coreAgentExplanations';
import { loadCoreAgentBooks, loadDefaultAgentBooks, type LoadDefaultAgentBooksOptions } from './loadDefaultAgentBooks';

/**
 * Identity of one bundled agent book used to match it against a persisted agent.
 *
 * @private utility of Agents Server default-agent tracking
 */
export type BundledAgentIdentity = {
    /**
     * Normalized agent name that matches the persisted `agentName` column.
     */
    readonly agentName: string;

    /**
     * Human-readable title taken from the first line of the book.
     */
    readonly title: string;

    /**
     * Hash the persisted agent would have right after seeding from the repository book.
     */
    readonly expectedAgentHash: string;
};

/**
 * Presence and repository-difference report for one bundled core agent.
 *
 * @private utility of Agents Server default-agent tracking
 */
export type CoreAgentReport = BundledAgentIdentity & {
    /**
     * Explanation of why this core agent exists.
     */
    readonly explanation: string;

    /**
     * Whether the core agent currently exists on this server.
     */
    readonly isPresent: boolean;

    /**
     * Whether the present core agent differs from the bundled repository book.
     *
     * This is informational only — an edited core agent is perfectly fine and must not be treated as a warning.
     */
    readonly isDifferentFromRepository: boolean;

    /**
     * Permanent id of the present agent, used to link to its editable book.
     */
    readonly permanentId: string | null;
};

/**
 * Presence report for one bundled normal default agent.
 *
 * @private utility of Agents Server default-agent tracking
 */
export type DefaultAgentReport = BundledAgentIdentity & {
    /**
     * Whether the default agent currently exists on this server.
     */
    readonly isPresent: boolean;

    /**
     * Permanent id of the present agent, used to link to its editable book.
     */
    readonly permanentId: string | null;
};

/**
 * Combined status of the bundled normal default agents and core default agents on the current server.
 *
 * @private utility of Agents Server default-agent tracking
 */
export type DefaultAgentsStatus = {
    readonly coreAgents: ReadonlyArray<CoreAgentReport>;
    readonly defaultAgents: ReadonlyArray<DefaultAgentReport>;
    readonly isAnyCoreAgentMissing: boolean;
    readonly isAnyDefaultAgentMissing: boolean;
};

/**
 * In-memory cache of parsed bundled identities keyed by the resolved default-agent directory.
 *
 * The bundled books never change while the process runs, so parsing them once avoids repeated disk reads on every
 * admin page render.
 *
 * @private utility of Agents Server default-agent tracking
 */
const cachedIdentitiesByDirectoryKey = new Map<
    string,
    {
        readonly defaultAgents: ReadonlyArray<BundledAgentIdentity>;
        readonly coreAgents: ReadonlyArray<BundledAgentIdentity>;
    }
>();

/**
 * Loads the parsed identities of the bundled default and core agent books.
 *
 * @param options - Optional explicit default-agent directory.
 * @returns Parsed identities for the normal default agents and the core agents.
 *
 * @private utility of Agents Server default-agent tracking
 */
export async function loadBundledAgentIdentities(options: LoadDefaultAgentBooksOptions = {}): Promise<{
    readonly defaultAgents: ReadonlyArray<BundledAgentIdentity>;
    readonly coreAgents: ReadonlyArray<BundledAgentIdentity>;
}> {
    const directoryKey = options.defaultAgentDirectory ?? '<default>';
    const cachedIdentities = cachedIdentitiesByDirectoryKey.get(directoryKey);
    if (cachedIdentities) {
        return cachedIdentities;
    }

    const [defaultAgentBooks, coreAgentBooks] = await Promise.all([
        loadDefaultAgentBooks(options),
        loadCoreAgentBooks(options),
    ]);
    const identities = {
        defaultAgents: defaultAgentBooks.map(createBundledAgentIdentity),
        coreAgents: coreAgentBooks.map(createBundledAgentIdentity),
    };
    cachedIdentitiesByDirectoryKey.set(directoryKey, identities);
    return identities;
}

/**
 * Resolves the presence and repository-difference status of the bundled default and core agents.
 *
 * @param options - Optional explicit default-agent directory.
 * @returns Combined status used by the home page notices and the Core Agents admin page.
 *
 * @private utility of Agents Server default-agent tracking
 */
export async function resolveDefaultAgentsStatus(
    options: LoadDefaultAgentBooksOptions = {},
): Promise<DefaultAgentsStatus> {
    const [{ defaultAgents: defaultIdentities, coreAgents: coreIdentities }, presentAgentByName] = await Promise.all([
        loadBundledAgentIdentities(options),
        loadPresentAgentsByName(),
    ]);

    const coreAgents = coreIdentities.map((identity) => {
        const presentAgent = presentAgentByName.get(identity.agentName);
        return {
            ...identity,
            explanation: resolveCoreAgentExplanation(identity.agentName),
            isPresent: presentAgent !== undefined,
            isDifferentFromRepository:
                presentAgent !== undefined && presentAgent.agentHash !== identity.expectedAgentHash,
            permanentId: presentAgent?.permanentId ?? null,
        };
    });
    const defaultAgents = defaultIdentities.map((identity) => {
        const presentAgent = presentAgentByName.get(identity.agentName);
        return {
            ...identity,
            isPresent: presentAgent !== undefined,
            permanentId: presentAgent?.permanentId ?? null,
        };
    });

    return {
        coreAgents,
        defaultAgents,
        isAnyCoreAgentMissing: coreAgents.some((coreAgent) => !coreAgent.isPresent),
        isAnyDefaultAgentMissing: defaultAgents.some((defaultAgent) => !defaultAgent.isPresent),
    };
}

/**
 * Returns the normalized names of core agents that are missing from a set of present agent names.
 *
 * This lightweight check reuses an already-loaded agent list (for example the header organization state) so the admin
 * menu can flag missing core agents without an extra database query.
 *
 * @param coreIdentities - Parsed identities of the bundled core agents.
 * @param presentAgentNames - Names of the agents already present on the server.
 * @returns Normalized names of the core agents that are not present.
 *
 * @private utility of Agents Server default-agent tracking
 */
export function resolveMissingCoreAgentNames(
    coreIdentities: ReadonlyArray<BundledAgentIdentity>,
    presentAgentNames: Iterable<string>,
): ReadonlyArray<string> {
    const presentAgentNameSet = new Set(presentAgentNames);
    return coreIdentities
        .filter((identity) => !presentAgentNameSet.has(identity.agentName))
        .map((identity) => identity.agentName);
}

/**
 * Builds one bundled agent identity from a raw book source.
 *
 * The expected hash is computed exactly the way the seeding flow persists the agent, so a freshly seeded agent is never
 * reported as differing from the repository.
 *
 * @param agentBook - Raw bundled agent book source.
 * @returns Parsed identity for the bundled agent.
 *
 * @private utility of Agents Server default-agent tracking
 */
function createBundledAgentIdentity(agentBook: string_book): BundledAgentIdentity {
    const { agentProfile } = prepareAgentSourceForPersistence(agentBook);
    return {
        agentName: agentProfile.agentName,
        title: resolveBundledAgentTitle(agentBook) ?? agentProfile.agentName,
        expectedAgentHash: agentProfile.agentHash,
    };
}

/**
 * Extracts the human-readable title (first non-empty line) from a book source.
 *
 * @param agentBook - Raw bundled agent book source.
 * @returns Title line, or `null` when the book has no visible title.
 *
 * @private utility of Agents Server default-agent tracking
 */
function resolveBundledAgentTitle(agentBook: string_book): string | null {
    for (const line of agentBook.split(/\r?\n/)) {
        const trimmedLine = line.trim();
        if (trimmedLine !== '') {
            return trimmedLine;
        }
    }
    return null;
}

/**
 * Loads all active agents on the current server indexed by their normalized name.
 *
 * @returns Map from normalized agent name to its basic information.
 *
 * @private utility of Agents Server default-agent tracking
 */
async function loadPresentAgentsByName(): Promise<ReadonlyMap<string, AgentBasicInformation>> {
    const collection = await $provideAgentCollectionForServer();
    const presentAgents = await collection.listAgents();
    return new Map(presentAgents.map((presentAgent) => [presentAgent.agentName, presentAgent]));
}
