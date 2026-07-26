import type { string_email, string_markdown } from '@promptbook-local/types';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { EmailAddress, OutboundEmail } from '../../message-providers/email/_common/Email';
import { parseEmailAddress } from '../../message-providers/email/_common/utils/parseEmailAddress';
import { getUserChatJobById } from '../userChat/getUserChatJobById';
import { extractEmailAddress, normalizeEmailAddressForIdentity } from './agentEmailAddress';
import { parseEmailUserChatContext } from './EmailUserChatContext';
import { sendEmailThroughStalwart } from './sendEmailThroughStalwart';

/**
 * Prefix used for idempotent outbound Message rows generated from email chat jobs.
 */
const EMAIL_CHAT_REPLY_THREAD_PREFIX = 'agent-email-reply:';

/**
 * Sends the completed assistant answer back to every participant in the originating email.
 */
export async function sendEmailChatReply(options: {
    readonly jobId: string;
    readonly content: string;
}): Promise<void> {
    const job = await getUserChatJobById(options.jobId);
    const emailContext = job ? parseEmailUserChatContext(job.parameters) : null;

    if (!emailContext) {
        return;
    }

    const threadId = `${EMAIL_CHAT_REPLY_THREAD_PREFIX}${options.jobId}`;
    if (await doesOutboundMessageExist(threadId)) {
        return;
    }

    const deliveredTo = extractEmailAddress(emailContext.deliveredTo);
    const selfIdentity = normalizeEmailAddressForIdentity(deliveredTo);
    const to = uniqueParticipantAddresses(
        [emailContext.sender, ...emailContext.to],
        selfIdentity,
        emailContext.agentLocalParts,
    );
    const cc = uniqueParticipantAddresses(emailContext.cc, selfIdentity, emailContext.agentLocalParts).map(
        parseEmailAddress,
    );
    const references = [
        ...emailContext.references,
        ...(emailContext.messageId ? [emailContext.messageId] : []),
    ].filter((value, index, values) => values.indexOf(value) === index);

    const email: OutboundEmail = {
        channel: 'EMAIL',
        direction: 'OUTBOUND',
        sender: formatEmailSender(emailContext.agentDisplayName, deliveredTo) as string_email,
        recipients: to as string_email[],
        cc: cc as EmailAddress[],
        subject: createReplySubject(emailContext.subject),
        content: options.content as string_markdown,
        attachments: [],
        threadId,
        metadata: {
            subject: createReplySubject(emailContext.subject),
            inReplyTo: emailContext.messageId,
            references,
            headers: {
                'Auto-Submitted': 'auto-replied',
                'X-Promptbook-Agent-Reply': options.jobId,
            },
            source: 'EMAIL_CHAT',
            userChatJobId: options.jobId,
        },
    };

    await sendEmailThroughStalwart(email);
}

/**
 * Checks whether the durable job reply was already persisted and sent.
 */
async function doesOutboundMessageExist(threadId: string): Promise<boolean> {
    const supabase = await $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('Message'))
        .select('id')
        .eq('threadId', threadId)
        .eq('direction', 'OUTBOUND')
        .limit(1);

    if (error) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to check email reply idempotency for \`${threadId}\`.

                **Cause:** \`${error.message}\`
            `),
        );
    }

    return Boolean(data?.length);
}

/**
 * Deduplicates reply-all participants while excluding the responding mailbox.
 */
function uniqueParticipantAddresses(
    values: ReadonlyArray<string>,
    selfIdentity: string,
    agentLocalParts: ReadonlyArray<string>,
): string[] {
    const seen = new Set<string>();

    return values.filter((value) => {
        const identity = normalizeEmailAddressForIdentity(value);
        if (!identity || isSameAgentMailbox(identity, selfIdentity, agentLocalParts) || seen.has(identity)) {
            return false;
        }

        seen.add(identity);
        return true;
    });
}

/**
 * Treats dotted and compact aliases on the responding domain as the same agent mailbox.
 */
function isSameAgentMailbox(
    firstAddress: string,
    secondAddress: string,
    agentLocalParts: ReadonlyArray<string>,
): boolean {
    const [firstLocalPart, firstDomain] = firstAddress.split('@');
    const [secondLocalPart, secondDomain] = secondAddress.split('@');

    if (!firstLocalPart || !firstDomain || !secondLocalPart || !secondDomain) {
        return false;
    }

    return firstDomain === secondDomain && agentLocalParts.includes(firstLocalPart);
}

/**
 * Formats the display name and exact delivered-to alias used in the From header.
 */
function formatEmailSender(displayName: string, address: string): string {
    return `"${displayName.replace(/["\\]/g, '\\$&')}" <${address}>`;
}

/**
 * Adds a single reply prefix to a subject.
 */
function createReplySubject(subject: string): string {
    const normalizedSubject = subject.trim() || 'No subject';
    return /^re:/i.test(normalizedSubject) ? normalizedSubject : `Re: ${normalizedSubject}`;
}
