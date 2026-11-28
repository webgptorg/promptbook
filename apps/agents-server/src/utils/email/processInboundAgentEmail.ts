import { createHash } from 'node:crypto';
import type { string_email, string_markdown } from '@promptbook-local/types';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { InboundEmail, OutboundEmail } from '../../message-providers/email/_common/Email';
import { createMessage } from '../messages/createMessage';
import { appendQueuedUserChatTurn } from '../userChat/appendQueuedUserChatTurn';
import { createUserChat } from '../userChat/createUserChat';
import { getUserChat } from '../userChat/getUserChat';
import { triggerUserChatJobWorker } from '../userChat/triggerUserChatJobWorker';
import { USER_CHAT_SOURCES } from '../userChat/UserChatSource';
import {
    extractEmailAddress,
    normalizeAgentEmailRecipientLocalPart,
    normalizeEmailDomain,
} from './agentEmailAddress';
import { isEmailSystemLocalPart } from './emailSystemAddresses';
import { EMAIL_USER_CHAT_CONTEXT_PARAMETER, type EmailUserChatContext } from './EmailUserChatContext';
import { findOrCreateEmailAdHocUser } from './findOrCreateEmailAdHocUser';
import {
    findAgentEmailIdentity,
    listAgentEmailIdentities,
    type AgentEmailIdentity,
} from './listAgentEmailIdentities';
import { sendEmailThroughStalwart } from './sendEmailThroughStalwart';

/**
 * Required text returned to senders who address an unknown agent.
 */
const UNKNOWN_AGENT_MESSAGE =
    'Sorry, the agent you are trying to reach does not exist. Please check the email address and try again.';

/**
 * Stalwart envelope information retained outside the visible message headers.
 */
export type InboundAgentEmailEnvelope = {
    readonly sender: string;
    readonly recipients: ReadonlyArray<string>;
    readonly queueId: string | null;
};

/**
 * Result of accepting and dispatching one inbound Stalwart email.
 */
export type ProcessInboundAgentEmailResult = {
    readonly createdChatIds: ReadonlyArray<string>;
    readonly missingRecipients: ReadonlyArray<string>;
};

/**
 * Routes one inbound message to agent chats and schedules the generated answers.
 */
export async function processInboundAgentEmail(options: {
    readonly email: InboundEmail;
    readonly envelope: InboundAgentEmailEnvelope;
    readonly domain: string;
    readonly origin: string;
}): Promise<ProcessInboundAgentEmailResult> {
    const domain = normalizeEmailDomain(options.domain);

    if (isAutomatedAgentReply(options.email)) {
        return { createdChatIds: [], missingRecipients: [] };
    }

    const identities = await listAgentEmailIdentities(domain);
    const localRecipients = options.envelope.recipients.filter(
        (recipient) => extractEmailAddress(recipient).toLowerCase().endsWith(`@${domain}`),
    );
    const recipientMatches = localRecipients.map((recipient) => ({
        recipient,
        identity: findAgentEmailIdentity(identities, normalizeAgentEmailRecipientLocalPart(recipient)),
    }));
    const missingRecipients = recipientMatches
        .filter(
            (match) =>
                !match.identity &&
                !isEmailSystemLocalPart(normalizeAgentEmailRecipientLocalPart(match.recipient)),
        )
        .map((match) => match.recipient);
    const inboundThreadId = createInboundEmailThreadId(options.email, options.envelope);

    await persistInboundEmailOnce(options.email, options.envelope, inboundThreadId);

    const sender = options.email.sender || options.envelope.sender;
    if (!sender) {
        return { createdChatIds: [], missingRecipients };
    }

    if (missingRecipients.length > 0) {
        await sendUnknownAgentReply({
            sender,
            domain,
            originalSubject: options.email.subject,
            messageId: readStringMetadata(options.email, 'messageId'),
            identities,
            threadId: `${inboundThreadId}:unknown`,
        });
    }

    const senderUser = await findOrCreateEmailAdHocUser(sender);
    const createdChatIds: string[] = [];
    for (const match of recipientMatches) {
        if (!match.identity) {
            continue;
        }

        const chatId = createEmailChatId(inboundThreadId, match.identity.permanentId);
        const existingChat = await getUserChat({
            userId: senderUser.id,
            viewerIsAdmin: true,
            agentPermanentId: match.identity.permanentId,
            chatId,
        });
        if (existingChat?.messages.length) {
            createdChatIds.push(chatId);
            continue;
        }

        if (!existingChat) {
            await createUserChat({
                chatId,
                userId: senderUser.id,
                agentPermanentId: match.identity.permanentId,
                source: USER_CHAT_SOURCES.EMAIL,
                title: options.email.subject.trim() || 'Email conversation',
            });
        }
        const emailContext: EmailUserChatContext = {
            agentDisplayName: match.identity.displayName,
            agentLocalParts: match.identity.aliases,
            sender,
            to: normalizeInboundEmailRecipients(options.email.recipients),
            cc: options.email.cc.map((address) => address.fullEmail),
            deliveredTo: match.recipient,
            subject: options.email.subject,
            messageId: readStringMetadata(options.email, 'messageId'),
            references: readStringArrayMetadata(options.email, 'references'),
        };
        const enqueuedTurn = await appendQueuedUserChatTurn({
            userId: senderUser.id,
            agentPermanentId: match.identity.permanentId,
            chatId,
            clientMessageId: `${inboundThreadId}:${match.identity.permanentId}`,
            messageContent: createInboundAgentEmailMessage(options.email, sender),
            parameters: {
                [EMAIL_USER_CHAT_CONTEXT_PARAMETER]: emailContext,
            },
            chatHistorySource: 'EMAIL',
            chatHistoryActorType: 'ANONYMOUS',
        });

        createdChatIds.push(chatId);
        await triggerUserChatJobWorker({
            origin: options.origin,
            preferredJobId: enqueuedTurn.job.id,
        }).catch((error) => {
            console.error('[email-chat]', 'worker_trigger_failed', {
                chatId,
                jobId: enqueuedTurn.job.id,
                error,
            });
        });
    }

    return { createdChatIds, missingRecipients };
}

/**
 * Persists one inbound transport message for administration and audit history.
 */
async function persistInboundEmailOnce(
    email: InboundEmail,
    envelope: InboundAgentEmailEnvelope,
    threadId: string,
): Promise<void> {
    const supabase = await $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('Message'))
        .select('id')
        .eq('threadId', threadId)
        .eq('direction', 'INBOUND')
        .limit(1);

    if (error) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to check inbound email idempotency for \`${threadId}\`.

                **Cause:** \`${error.message}\`
            `),
        );
    }

    if (data?.length) {
        return;
    }

    await createMessage({
        ...email,
        threadId,
        metadata: {
            ...(email.metadata || {}),
            subject: email.subject,
            cc: email.cc,
            envelopeSender: envelope.sender,
            envelopeRecipients: envelope.recipients,
            stalwartQueueId: envelope.queueId,
            source: 'STALWART_MTA_HOOK',
        },
    });
}

/**
 * Sends the required unknown-agent response with the current list of public agents.
 */
async function sendUnknownAgentReply(options: {
    readonly sender: string;
    readonly domain: string;
    readonly originalSubject: string;
    readonly messageId: string | null;
    readonly identities: ReadonlyArray<AgentEmailIdentity>;
    readonly threadId: string;
}): Promise<void> {
    if (await doesMessageExist(options.threadId)) {
        return;
    }

    const publicAgents = options.identities.filter((identity) => identity.visibility === 'PUBLIC');
    const agentList =
        publicAgents.length > 0
            ? `\n\nPublic agents on this server:\n${publicAgents
                  .map((identity) => `- ${identity.displayName}: ${identity.preferredEmail}`)
                  .join('\n')}`
            : '\n\nThere are currently no public agents on this server.';
    const email: OutboundEmail = {
        channel: 'EMAIL',
        direction: 'OUTBOUND',
        sender: `"Agents Server" <postmaster@${options.domain}>` as string_email,
        recipients: [options.sender as string_email],
        cc: [],
        subject: createReplySubject(options.originalSubject),
        content: `${UNKNOWN_AGENT_MESSAGE}${agentList}` as string_markdown,
        attachments: [],
        threadId: options.threadId,
        metadata: {
            subject: createReplySubject(options.originalSubject),
            inReplyTo: options.messageId,
            references: options.messageId ? [options.messageId] : [],
            headers: {
                'Auto-Submitted': 'auto-replied',
                'X-Promptbook-Agent-Reply': 'unknown-agent',
            },
            source: 'UNKNOWN_AGENT_REPLY',
        },
    };

    await sendEmailThroughStalwart(email);
}

/**
 * Creates a deterministic id for one source email and target agent.
 */
function createEmailChatId(inboundThreadId: string, agentPermanentId: string): string {
    return `email-${createHash('sha256').update(`${inboundThreadId}\0${agentPermanentId}`).digest('hex').slice(0, 28)}`;
}

/**
 * Creates a stable inbound Message thread id from RFC and transport identifiers.
 */
function createInboundEmailThreadId(email: InboundEmail, envelope: InboundAgentEmailEnvelope): string {
    const identity =
        readStringMetadata(email, 'messageId') ||
        envelope.queueId ||
        `${envelope.sender}\0${envelope.recipients.join(',')}\0${email.subject}\0${email.content}`;
    return `agent-email-inbound:${createHash('sha256').update(identity).digest('hex')}`;
}

/**
 * Detects replies generated by this service and standard automatic submissions.
 */
function isAutomatedAgentReply(email: InboundEmail): boolean {
    const autoSubmitted = readStringMetadata(email, 'autoSubmitted')?.toLowerCase();
    return Boolean(
        readStringMetadata(email, 'promptbookAgentReply') ||
            (autoSubmitted && autoSubmitted !== 'no'),
    );
}

/**
 * Reads one nullable string from arbitrary email metadata.
 */
function readStringMetadata(email: InboundEmail, key: string): string | null {
    const value = email.metadata?.[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Reads a string array from arbitrary email metadata.
 */
function readStringArrayMetadata(email: InboundEmail, key: string): string[] {
    const value = email.metadata?.[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/**
 * Checks whether a Message row already owns the supplied thread id.
 */
async function doesMessageExist(threadId: string): Promise<boolean> {
    const supabase = await $provideSupabaseForServer();
    const { data, error } = await supabase
        .from(await $getTableName('Message'))
        .select('id')
        .eq('threadId', threadId)
        .limit(1);

    if (error) {
        throw new DatabaseError(
            spaceTrim(`
                Failed to check email response idempotency for \`${threadId}\`.

                **Cause:** \`${error.message}\`
            `),
        );
    }

    return Boolean(data?.length);
}

/**
 * Adds a single reply prefix to a subject.
 */
function createReplySubject(subject: string): string {
    const normalizedSubject = subject.trim() || 'No subject';
    return /^re:/i.test(normalizedSubject) ? normalizedSubject : `Re: ${normalizedSubject}`;
}

/**
 * Gives the agent the transport context it needs to write an appropriate email response.
 */
function createInboundAgentEmailMessage(email: InboundEmail, sender: string): string_markdown {
    const recipients = normalizeInboundEmailRecipients(email.recipients);
    const recipientLines = [
        `**Email from:** ${sender}`,
        `**Email to:** ${recipients.join(', ') || '(not provided)'}`,
        ...(email.cc.length > 0
            ? [`**Email cc:** ${email.cc.map((address) => address.fullEmail).join(', ')}`]
            : []),
        `**Email subject:** ${email.subject.trim() || '(no subject)'}`,
    ];

    return spaceTrim(`
        ${recipientLines.join('\n')}

        ---

        ${email.content}
    `) as string_markdown;
}

/**
 * Normalizes the shared Message type's singular-or-array recipients field.
 */
function normalizeInboundEmailRecipients(recipients: InboundEmail['recipients']): string[] {
    if (!recipients) {
        return [];
    }

    if (typeof recipients === 'string') {
        return [recipients];
    }

    return [...recipients].filter(Boolean);
}
