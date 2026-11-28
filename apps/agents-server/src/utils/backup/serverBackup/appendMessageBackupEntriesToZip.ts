import JSZip from 'jszip';
import { loadTableRows, type ServerBackupContext } from './serverBackupContext';
import { createBackupStem, createUniqueBackupFilename, ensureJsonFilename } from './serverBackupFilenames';
import { groupRowsBy } from './serverBackupRowUtilities';

/**
 * Writes one JSON file per system message with delivery history.
 *
 * @param zip - ZIP archive being assembled.
 * @param sectionRootPath - Root path for the messages section.
 * @param context - Shared backup context.
 *
 * @private function of `createServerBackupZipStream`
 */
export async function appendMessageBackupEntriesToZip(
    zip: JSZip,
    sectionRootPath: string,
    context: ServerBackupContext,
): Promise<void> {
    const [messageRows, sendAttemptRows] = await Promise.all([
        loadTableRows(context.supabase, 'Message'),
        loadTableRows(context.supabase, 'MessageSendAttempt'),
    ]);
    const usedMessageFilenames = new Set<string>();
    const sendAttemptsByMessageId = groupRowsBy(sendAttemptRows, (row) => row.messageId);

    for (const messageRow of messageRows) {
        const filename = createUniqueBackupFilename(
            usedMessageFilenames,
            ensureJsonFilename(
                createBackupStem(
                    [messageRow.channel, messageRow.direction, messageRow.createdAt],
                    `message-${messageRow.id}`,
                ),
            ),
            `message-${messageRow.id}`,
        );
        const sendAttempts = sendAttemptsByMessageId.get(messageRow.id) || [];

        zip.file(
            `${sectionRootPath}/${filename}`,
            `${JSON.stringify(
                {
                    id: messageRow.id,
                    createdAt: messageRow.createdAt,
                    channel: messageRow.channel,
                    direction: messageRow.direction,
                    sender: messageRow.sender,
                    recipients: messageRow.recipients,
                    content: messageRow.content,
                    threadId: messageRow.threadId,
                    metadata: messageRow.metadata,
                    sendAttempts: sendAttempts.map((row) => ({
                        id: row.id,
                        createdAt: row.createdAt,
                        providerName: row.providerName,
                        isSuccessful: row.isSuccessful,
                    })),
                },
                null,
                2,
            )}\n`,
        );
    }
}
