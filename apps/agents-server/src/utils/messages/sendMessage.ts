import type { Message, really_any } from '@promptbook-local/types';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import { MESSAGE_PROVIDERS } from '../../message-providers';

/**
 * Sends a message
 */
export async function sendMessage(message: Message<really_any>): Promise<void> {
    const supabase = await $provideSupabaseForServer();
    // @ts-expect-error: Tables are not yet in types
    const messageTable = await $getTableName('Message');
    // @ts-expect-error: Tables are not yet in types
    const messageSendAttemptTable = await $getTableName('MessageSendAttempt');

    // 1. Insert message
    const { data: insertedMessage, error: insertError } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(messageTable as any)
        .insert({
            channel: message.channel || 'UNKNOWN',
            direction: message.direction || 'OUTBOUND',
            sender: message.sender,
            recipients: message.recipients,
            content: message.content,
            threadId: message.threadId,
            metadata: message.metadata,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .select()
        .single();

    if (insertError) {
        throw new Error(`Failed to insert message: ${insertError.message}`);
    }

    if (!insertedMessage) {
        throw new Error('Failed to insert message: No data returned');
    }

    // 2. If outbound and email, try to send
    if (message.direction === 'OUTBOUND' && message.channel === 'EMAIL') {
        const providers = Object.keys(MESSAGE_PROVIDERS);
        
        if (providers.length === 0) {
             console.warn('No email providers configured');
             return;
        }

        let isSent = false;
        
        for (const providerName of providers) {
            const provider = MESSAGE_PROVIDERS[providerName];
            let isSuccessful = false;
            let raw: really_any = null;

            try {
                raw = await provider.send(message);
                isSuccessful = true;
                isSent = true;
            } catch (error) {
                console.error(`Failed to send email via ${providerName}`, error);
                raw = { error: error instanceof Error ? error.message : String(error) };
            }

            // 3. Log attempt
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await supabase.from(messageSendAttemptTable as any).insert({
                // @ts-expect-error: insertedMessage is any
                messageId: insertedMessage.id,
                providerName,
                isSuccessful,
                raw
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            if (isSuccessful) {
                break;
            }
        }
        
        if (!isSent) {
            throw new Error('Failed to send email via any provider');
        }
    }
}
