import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import { createAgentEmailAddress, createAgentEmailAliases } from './agentEmailAddress';

/**
 * Agent information shared by inbound routing, Stalwart synchronization, and administration screens.
 */
export type AgentEmailIdentity = {
    readonly agentName: string;
    readonly displayName: string;
    readonly permanentId: string;
    readonly visibility: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
    readonly aliases: ReadonlyArray<string>;
    readonly preferredEmail: string;
};

/**
 * Lists every active agent and its accepted email aliases for the current server.
 */
export async function listAgentEmailIdentities(domain: string): Promise<AgentEmailIdentity[]> {
    const supabase = await $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('Agent'))
        .select('agentName, permanentId, agentProfile, visibility, deletedAt')
        .is('deletedAt', null);

    if (error) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to list agents for email routing.

                **Cause:** \`${error.message}\`
            `),
        );
    }

    return (data || []).flatMap((row) => {
        if (!row.permanentId) {
            return [];
        }

        const displayName = resolveAgentDisplayName(row.agentProfile, row.agentName);
        const identity = {
            agentName: row.agentName,
            permanentId: row.permanentId,
            fullname: displayName,
        };

        return [
            {
                agentName: row.agentName,
                displayName,
                permanentId: row.permanentId,
                visibility: row.visibility,
                aliases: createAgentEmailAliases(identity),
                preferredEmail: createAgentEmailAddress(identity, domain),
            },
        ];
    });
}

/**
 * Finds the agent addressed by a normalized email local part.
 */
export function findAgentEmailIdentity(
    identities: ReadonlyArray<AgentEmailIdentity>,
    normalizedLocalPart: string,
): AgentEmailIdentity | null {
    const matches = identities.filter((identity) => identity.aliases.includes(normalizedLocalPart));

    if (matches.length <= 1) {
        return matches[0] || null;
    }

    const permanentIdMatch = matches.find((identity) =>
        createAgentEmailAliases({
            agentName: '',
            permanentId: identity.permanentId,
        }).includes(normalizedLocalPart),
    );

    return permanentIdMatch || null;
}

/**
 * Reads an agent's human-facing full name from the persisted profile.
 */
function resolveAgentDisplayName(agentProfile: unknown, fallbackAgentName: string): string {
    if (!agentProfile || typeof agentProfile !== 'object' || Array.isArray(agentProfile)) {
        return fallbackAgentName;
    }

    const meta = Reflect.get(agentProfile, 'meta');
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
        return fallbackAgentName;
    }

    const fullname = Reflect.get(meta, 'fullname');
    return typeof fullname === 'string' && fullname.trim() ? fullname.trim() : fallbackAgentName;
}
