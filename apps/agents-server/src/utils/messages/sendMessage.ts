import type { really_any } from '@promptbook-local/types';
import { serializeError } from '@promptbook-local/utils';
import { assertsError } from '../../../../../src/errors/assertsError';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import { EMAIL_PROVIDERS } from '../../message-providers';
import { OutboundEmail } from '../../message-providers/email/_common/Email';

/**
 * Sends a message
 */
export async function sendMessage(message: OutboundEmail): Promise<void> {
    const supabase = await $provideSupabaseForServer();

    // 1. Insert message
    const { data: insertedMessage, error: insertError } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(await $getTableName('Message'))
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
        const providers = Object.keys(EMAIL_PROVIDERS);

        if (providers.length === 0) {
            console.warn('No email providers configured');
            return;
        }

        let isSent = false;

        for (const providerName of providers) {
            const provider = EMAIL_PROVIDERS[providerName];
            let isSuccessful = false;
            let raw: really_any = null;

            try {
                console.log(`📤 Sending email via ${providerName}`);
                raw = await provider.send(message);
                isSuccessful = true;
                isSent = true;
            } catch (error) {
                assertsError(error);
                console.error(`Failed to send email via ${providerName}`, error);
                raw = { error: serializeError(error) };
            }

            // 3. Log attempt
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await supabase.from(await $getTableName('MessageSendAttempt')).insert({
                // @ts-expect-error: insertedMessage is any
                messageId: insertedMessage.id,
                providerName,
                isSuccessful,
                raw,
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

/**
 * TODO: !!!! Move to `message-providers` and rename `message-providers` -> `messages`
 */
