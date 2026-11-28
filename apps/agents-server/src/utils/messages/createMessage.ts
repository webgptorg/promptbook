import type { Message } from '../../../../../src/types/Message';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';

/**
 * Creates one `Message` row in the database.
 */
export async function createMessage(
    message: Message<unknown>,
): Promise<AgentsServerDatabase['public']['Tables']['Message']['Row']> {
    const supabase = await $provideSupabaseForServer();
    const tableName = await $getTableName('Message');

    const recipients = Array.isArray(message.recipients)
        ? message.recipients
        : message.recipients !== undefined
          ? [message.recipients]
          : null;

    const payload: AgentsServerDatabase['public']['Tables']['Message']['Insert'] = {
        channel: message.channel || 'UNKNOWN',
        direction: message.direction || 'OUTBOUND',
        sender: message.sender as AgentsServerDatabase['public']['Tables']['Message']['Insert']['sender'],
        recipients: recipients as AgentsServerDatabase['public']['Tables']['Message']['Insert']['recipients'],
        content: message.content,
        threadId: typeof message.threadId === 'string' ? message.threadId : null,
        metadata:
            message.metadata === undefined
                ? null
                : (message.metadata as AgentsServerDatabase['public']['Tables']['Message']['Insert']['metadata']),
    };

    const { data, error } = await supabase.from(tableName).insert(payload).select('*').single();
    if (error || !data) {
        throw new Error(error?.message || 'Failed to create Message record.');
    }

    return data as AgentsServerDatabase['public']['Tables']['Message']['Row'];
}
