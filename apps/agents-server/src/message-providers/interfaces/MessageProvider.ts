import type { Message, really_any, string_email } from '@promptbook-local/types';

/**
 * Type describing message provider.
 */
export type MessageProvider = {
    /**
     * Sends a message through the provider
     *
     * @param message The message to send
     * @returns Raw response from the provider
     */
    send(message: Message<string_email>): Promise<really_any>;
};
