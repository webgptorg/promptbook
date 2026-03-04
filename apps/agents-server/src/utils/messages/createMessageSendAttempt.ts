import type { really_any } from '../../../../../src/_packages/types.index';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';

/**
 * Input for persisting one MessageSendAttempt record.
 */
export type CreateMessageSendAttemptOptions = {
    messageId: number;
    providerName: string;
    isSuccessful: boolean;
    raw: really_any;
};

/**
 * Creates one `MessageSendAttempt` row in the database.
 */
export async function createMessageSendAttempt(
    options: CreateMessageSendAttemptOptions,
): Promise<AgentsServerDatabase['public']['Tables']['MessageSendAttempt']['Row']> {
    const supabase = await $provideSupabaseForServer();
    const tableName = await $getTableName('MessageSendAttempt');

    const payload: AgentsServerDatabase['public']['Tables']['MessageSendAttempt']['Insert'] = {
        messageId: options.messageId,
        providerName: options.providerName,
        isSuccessful: options.isSuccessful,
        raw: options.raw as AgentsServerDatabase['public']['Tables']['MessageSendAttempt']['Insert']['raw'],
    };

    const { data, error } = await supabase.from(tableName).insert(payload).select('*').single();
    if (error || !data) {
        throw new Error(error?.message || 'Failed to create MessageSendAttempt record.');
    }

    return data as AgentsServerDatabase['public']['Tables']['MessageSendAttempt']['Row'];
}
