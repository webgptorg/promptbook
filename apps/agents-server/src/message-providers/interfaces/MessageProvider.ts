import type { Message, really_any } from '@promptbook-local/types';

export type MessageProvider = {
    /**
     * Sends a message through the provider
     * 
     * @param message The message to send
     * @returns Raw response from the provider
     */
    send(message: Message<really_any>): Promise<really_any>;
}
