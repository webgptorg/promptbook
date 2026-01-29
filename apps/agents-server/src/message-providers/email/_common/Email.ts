import type { Message, string_email, string_person_fullname } from '@promptbook-local/types';

/**
 * Single email which was received by the application
 */
export type InboundEmail = Email & { direction: 'INBOUND' };

/**
 * Single email which was sended from the application
 */
export type OutboundEmail = Email & { direction: 'OUTBOUND' };

/**
 * Single email
 */
type Email = Message<string_email> & {
    /**
     * Channel of the message
     *
     * @default 'EMAIL'
     */
    readonly channel?: 'EMAIL';

    /**
     * Carbon copy email addresses
     *
     * Note: Not working with BCC (Blind Carbon Copy) because we want to have all emails in the same thread
     *       and for hidden emails we can just call $sendEmail multiple times
     */
    readonly cc: Array<EmailAddress>;

    /**
     * Email subject
     */
    readonly subject: string;

    /**
     * Email attachments
     */
    readonly attachments: Array<File>;
};

export type EmailAddress = {
    /**
     * Everything outside of `<>` in email address
     *
     * @example "Pavol Hejný <pavol@hejny.cz>" -> "Pavol Hejný"
     * @example "\"Pavol Hejný\" <pavol@hejny.cz>" -> "Pavol Hejný"
     */
    fullName: string_person_fullname | string | null;

    /**
     * Everything after `+` in email address
     *
     * @example "pavol+spam@webgpt.cz" -> ["spam"]
     * @example "pavol+spam+debug@webgpt.cz" -> ["spam","debug"]
     */
    plus: Array<string>;

    /**
     * Pure email address
     *
     * @example "pavol@webgpt.cz"
     */
    baseEmail: string_email;

    /**
     * Full email address without the name but with +
     *
     * @example "pavol+test@webgpt.cz"
     */
    fullEmail: string_email;
};
