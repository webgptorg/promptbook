import type { TODO_any } from '@promptbook-local/types';
import { $provideSupabaseForServer } from '../database/$provideSupabaseForServer';
import { $provideServer } from '../tools/$provideServer';
import { $randomBase58 } from '../../../../src/utils/random/$randomBase58';

/**
 * Length of generated push-subscription identifiers.
 */
const GENERATED_USER_PUSH_SUBSCRIPTION_ID_LENGTH = 14;

/**
 * Persisted browser push subscription row stored for one user/device.
 */
export type UserPushSubscriptionRecord = {
    id: string;
    createdAt: string;
    updatedAt: string;
    userId: number;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent: string | null;
    isChatFocused: boolean;
    focusedAgentPermanentId: string | null;
    focusedChatId: string | null;
    focusUpdatedAt: string | null;
};

/**
 * Input payload used when creating or refreshing one stored subscription.
 */
export type UpsertUserPushSubscriptionOptions = {
    userId: number;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string | null;
};

/**
 * Input payload used when updating one subscription focus heartbeat.
 */
export type UpdateUserPushSubscriptionFocusOptions = {
    userId: number;
    subscriptionId: string;
    isChatFocused: boolean;
    focusedAgentPermanentId?: string | null;
    focusedChatId?: string | null;
};

/**
 * Provides the scoped Supabase query builder for `UserPushSubscription`.
 */
async function provideUserPushSubscriptionTable(): Promise<TODO_any> {
    const supabase = $provideSupabaseForServer() as TODO_any;
    const tableName = await getUserPushSubscriptionTableName();

    return supabase.from(tableName);
}

/**
 * Lists all stored push subscriptions for one user.
 */
export async function listUserPushSubscriptions(userId: number): Promise<Array<UserPushSubscriptionRecord>> {
    const userPushSubscriptionTable = await provideUserPushSubscriptionTable();
    const { data, error } = await userPushSubscriptionTable
        .select('*')
        .eq('userId', userId)
        .order('updatedAt', { ascending: false });

    if (error) {
        throw new Error(`Failed to list user push subscriptions for user "${userId}": ${error.message}`);
    }

    return (data || []) as Array<UserPushSubscriptionRecord>;
}

/**
 * Creates or refreshes one stored push subscription for a user/device.
 */
export async function upsertUserPushSubscription(
    options: UpsertUserPushSubscriptionOptions,
): Promise<UserPushSubscriptionRecord> {
    const userPushSubscriptionTable = await provideUserPushSubscriptionTable();
    const nowIso = new Date().toISOString();
    const { data: existingRow, error: existingRowError } = await userPushSubscriptionTable
        .select('*')
        .eq('endpoint', options.endpoint)
        .maybeSingle();

    if (existingRowError) {
        throw new Error(
            `Failed to load existing push subscription "${options.endpoint}": ${existingRowError.message}`,
        );
    }

    const nextPayload = {
        id: existingRow?.id || $randomBase58(GENERATED_USER_PUSH_SUBSCRIPTION_ID_LENGTH),
        createdAt: existingRow?.createdAt || nowIso,
        updatedAt: nowIso,
        userId: options.userId,
        endpoint: options.endpoint,
        p256dh: options.p256dh,
        auth: options.auth,
        userAgent: options.userAgent || null,
        isChatFocused: existingRow?.isChatFocused ?? false,
        focusedAgentPermanentId: existingRow?.focusedAgentPermanentId ?? null,
        focusedChatId: existingRow?.focusedChatId ?? null,
        focusUpdatedAt: existingRow?.focusUpdatedAt ?? null,
    };

    const { data, error } = await userPushSubscriptionTable
        .upsert(nextPayload, { onConflict: 'endpoint' })
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to upsert push subscription "${options.endpoint}": ${error.message}`);
    }

    if (!data) {
        throw new Error(`Failed to upsert push subscription "${options.endpoint}".`);
    }

    return data as UserPushSubscriptionRecord;
}

/**
 * Deletes one stored push subscription by endpoint.
 */
export async function deleteUserPushSubscriptionByEndpoint(options: {
    userId?: number;
    endpoint: string;
}): Promise<void> {
    const userPushSubscriptionTable = await provideUserPushSubscriptionTable();
    let query = userPushSubscriptionTable.delete().eq('endpoint', options.endpoint);

    if (typeof options.userId === 'number') {
        query = query.eq('userId', options.userId);
    }

    const { error } = await query;

    if (error) {
        throw new Error(`Failed to delete push subscription "${options.endpoint}": ${error.message}`);
    }
}

/**
 * Deletes one stored push subscription by its internal id.
 */
export async function deleteUserPushSubscriptionById(options: {
    userId?: number;
    subscriptionId: string;
}): Promise<void> {
    const userPushSubscriptionTable = await provideUserPushSubscriptionTable();
    let query = userPushSubscriptionTable.delete().eq('id', options.subscriptionId);

    if (typeof options.userId === 'number') {
        query = query.eq('userId', options.userId);
    }

    const { error } = await query;

    if (error) {
        throw new Error(`Failed to delete push subscription "${options.subscriptionId}": ${error.message}`);
    }
}

/**
 * Updates the focused-chat heartbeat stored for one subscription.
 */
export async function updateUserPushSubscriptionFocus(
    options: UpdateUserPushSubscriptionFocusOptions,
): Promise<UserPushSubscriptionRecord | null> {
    const userPushSubscriptionTable = await provideUserPushSubscriptionTable();
    const nowIso = new Date().toISOString();
    const { data, error } = await userPushSubscriptionTable
        .update({
            updatedAt: nowIso,
            isChatFocused: options.isChatFocused,
            focusedAgentPermanentId:
                options.isChatFocused === true ? options.focusedAgentPermanentId || null : null,
            focusedChatId: options.isChatFocused === true ? options.focusedChatId || null : null,
            focusUpdatedAt: nowIso,
        })
        .eq('id', options.subscriptionId)
        .eq('userId', options.userId)
        .select('*')
        .maybeSingle();

    if (error) {
        throw new Error(
            `Failed to update push-subscription focus "${options.subscriptionId}": ${error.message}`,
        );
    }

    return (data as UserPushSubscriptionRecord | null) || null;
}

/**
 * Resolves the prefixed subscription table name without relying on generated schema typings.
 */
async function getUserPushSubscriptionTableName(): Promise<string> {
    const { tablePrefix } = await $provideServer();
    return `${tablePrefix}UserPushSubscription`;
}
