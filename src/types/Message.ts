import { Arrayable } from 'type-fest';
import { really_any } from '../_packages/types.index';
import { id, string_date_iso8601, string_markdown } from './typeAliases';

/**
 * A generic message structure for various communication channels
 */
export type Message<TParticipant> = {
    /**
     * Unique identifier of the message
     */
    readonly id?: id;

    /**
     * Date when the message was created
     */
    readonly createdAt?: Date | string_date_iso8601;

    /**
     * The communication channel of the message
     */
    readonly channel?: 'PROMPTBOOK_CHAT' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'TELEGRAM' | 'SIGNAL' | string | 'UNKNOWN';

    /**
     * Is the message send from the Promptbook or to the Promptbook
     */
    readonly direction?: 'INBOUND' | 'OUTBOUND' | 'INTERNAL' | 'INITIAL';

    /**
     * Who sent the message
     */
    readonly sender: TParticipant;
    // <- TODO: [👥] What about standard roles like 'USER' and 'ASSISTANT'

    /**
     * Who are the recipients of the message
     */
    readonly recipients?: Readonly<Arrayable<TParticipant>>;

    /**
     * The content of the message as markdown
     *
     * Note: We are converting all message content to markdown for consistency
     */
    readonly content: string_markdown;

    /**
     * The thread identifier the message belongs to
     *
     * - `null` means the message is not part of any thread
     * - `undefined` means that we don't know if the message is part of a thread or not
     */
    readonly threadId?: id | null;

    /**
     * Arbitrary metadata associated with the message
     */
    readonly metadata?: Readonly<Record<string, really_any>>;
};
