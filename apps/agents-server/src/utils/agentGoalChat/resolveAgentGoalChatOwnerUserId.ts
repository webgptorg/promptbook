import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';

/**
 * Resolves the database user the singleton goal chat of one agent is stored under.
 *
 * The goal chat conceptually belongs to the agent, not to any human, but `UserChat.userId` is a
 * non-null foreign key. The agent owner is therefore used, with the same fallback ordering the
 * ownership migration uses when an agent has no owner assigned yet.
 *
 * @param agentPermanentId - Permanent id of the agent owning the goal chat.
 * @returns Database user id used as the goal-chat owner.
 */
export async function resolveAgentGoalChatOwnerUserId(agentPermanentId: string): Promise<number> {
    const agentOwnerUserId = await loadAgentOwnerUserId(agentPermanentId);

    if (typeof agentOwnerUserId === 'number') {
        return agentOwnerUserId;
    }

    return loadFallbackOwnerUserId(agentPermanentId);
}

/**
 * Loads the owner of one agent row.
 *
 * @param agentPermanentId - Permanent id of the agent.
 * @returns Owning user id, or `null` when the agent has no owner assigned.
 *
 * @private function of `resolveAgentGoalChatOwnerUserId`
 */
async function loadAgentOwnerUserId(agentPermanentId: string): Promise<number | null> {
    const supabase = $provideSupabaseForServer();
    const agentTableName = await $getTableName('Agent');
    const { data, error } = await supabase
        .from(agentTableName)
        .select('userId')
        .eq('permanentId', agentPermanentId)
        .maybeSingle();

    if (error) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to load the owner of agent \`${agentPermanentId}\` for its goal chat.

                **Cause:** \`${error.message}\`
            `),
        );
    }

    const userId = (data as { userId?: unknown } | null)?.userId;
    return typeof userId === 'number' ? userId : null;
}

/**
 * Loads the fallback goal-chat owner used when an agent has no owner assigned.
 *
 * Mirrors the `fallbackUser` ordering of the ownership migration so unowned agents keep a stable,
 * predictable goal-chat owner.
 *
 * @param agentPermanentId - Permanent id of the agent, used only for error reporting.
 * @returns Database user id of the fallback owner.
 *
 * @private function of `resolveAgentGoalChatOwnerUserId`
 */
async function loadFallbackOwnerUserId(agentPermanentId: string): Promise<number> {
    const supabase = $provideSupabaseForServer();
    const userTableName = await $getTableName('User');
    const { data, error } = await supabase
        .from(userTableName)
        .select('id')
        .order('isAdmin', { ascending: false })
        .order('createdAt', { ascending: true })
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to resolve the fallback goal-chat owner for agent \`${agentPermanentId}\`.

                **Cause:** \`${error.message}\`
            `),
        );
    }

    const fallbackUserId = (data as { id?: unknown } | null)?.id;

    if (typeof fallbackUserId !== 'number') {
        throw new DatabaseError(
            spaceTrim(`
                Agent \`${agentPermanentId}\` has no owner and this server has no user to fall back to,
                so its goal chat cannot be stored.

                **Note:** Every goal chat is persisted as one \`UserChat\` row, which requires a \`userId\`.
            `),
        );
    }

    return fallbackUserId;
}
