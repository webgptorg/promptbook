import type { Json } from '../../../database/schema';
import { normalizeMessageContacts, type MessageContact } from './messageAdminPresentation';

/**
 * Props for one sender/recipients table cell.
 */
type MessageParticipantsProps = {
    readonly channel: string;
    readonly sender: Json;
    readonly recipients: Json;
};

/**
 * Renders sender and recipient values as named contacts instead of raw JSON.
 */
export function MessageParticipants({ channel, sender, recipients }: MessageParticipantsProps) {
    const senderContacts = normalizeMessageContacts(sender);
    const recipientContacts = normalizeMessageContacts(recipients);
    const isEmail = channel === 'EMAIL';

    return (
        <dl className="min-w-56 space-y-2 text-xs">
            <MessageContactList label={isEmail ? 'From' : 'Sender'} contacts={senderContacts} />
            <MessageContactList label={isEmail ? 'To' : 'Recipients'} contacts={recipientContacts} />
        </dl>
    );
}

/**
 * Props for one labelled group of message contacts.
 */
type MessageContactListProps = {
    readonly label: string;
    readonly contacts: ReadonlyArray<MessageContact>;
};

/**
 * Renders a compact label next to one or more message contacts.
 */
function MessageContactList({ label, contacts }: MessageContactListProps) {
    return (
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-2">
            <dt className="pt-0.5 font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
            <dd className="min-w-0 space-y-1">
                {contacts.length > 0
                    ? contacts.map((contact, index) => (
                          <MessageContactValue key={`${contact.address}:${index}`} contact={contact} />
                      ))
                    : '-'}
            </dd>
        </div>
    );
}

/**
 * Props for one normalized message contact.
 */
type MessageContactValueProps = {
    readonly contact: MessageContact;
};

/**
 * Renders an optional display name and a wrapping address or generic identifier.
 */
function MessageContactValue({ contact }: MessageContactValueProps) {
    return (
        <div className="min-w-0 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
            {contact.fullName ? <div className="truncate font-medium text-gray-800">{contact.fullName}</div> : null}
            {contact.isEmail ? (
                <a
                    href={`mailto:${contact.address}`}
                    className="break-all text-blue-700 hover:text-blue-900 hover:underline"
                    title={contact.address}
                >
                    {contact.address}
                </a>
            ) : (
                <div className="break-all text-gray-700" title={contact.address}>
                    {contact.address || '-'}
                </div>
            )}
        </div>
    );
}
