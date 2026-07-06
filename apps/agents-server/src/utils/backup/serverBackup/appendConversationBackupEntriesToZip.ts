import JSZip from 'jszip';
import { resolveFeedbackThreadMessages } from './resolveFeedbackThreadMessages';
import {
    loadAgentRows,
    loadChatFeedbackRows,
    loadUserChatRows,
    loadUserRows,
    type ServerBackupContext,
} from './serverBackupContext';
import {
    createBackupStem,
    createJsonMetadataFilename,
    createUniqueBackupFilename,
    ensureJsonFilename,
} from './serverBackupFilenames';
import { createAgentPreviewByName, createAgentPreviewByPermanentId, createUserPreviewById } from './serverBackupPreviews';
import { normalizeOptionalText, resolveSerializableArray } from './serverBackupRowUtilities';

/**
 * Writes one JSON chat export per conversation and per feedback thread.
 *
 * @param zip - ZIP archive being assembled.
 * @param sectionRootPath - Root path for the conversations section.
 * @param context - Shared backup context.
 *
 * @private function of `createServerBackupZipStream`
 */
export async function appendConversationBackupEntriesToZip(
    zip: JSZip,
    sectionRootPath: string,
    context: ServerBackupContext,
): Promise<void> {
    const [userChats, users, agents, feedbackRows] = await Promise.all([
        loadUserChatRows(context),
        loadUserRows(context),
        loadAgentRows(context),
        loadChatFeedbackRows(context),
    ]);

    const chatsRootPath = `${sectionRootPath}/chats`;
    const feedbackRootPath = `${sectionRootPath}/feedback`;
    const usedChatFilenames = new Set<string>();
    const usedFeedbackFilenames = new Set<string>();
    const userPreviewById = createUserPreviewById(users);
    const agentPreviewByPermanentId = createAgentPreviewByPermanentId(agents);
    const agentPreviewByName = createAgentPreviewByName(agents);

    zip.folder(chatsRootPath);
    zip.folder(feedbackRootPath);

    for (const chat of userChats) {
        const userPreview = userPreviewById.get(chat.userId) || null;
        const agentPreview = agentPreviewByPermanentId.get(chat.agentPermanentId) || {
            id: 0,
            agentName: chat.agentPermanentId,
            permanentId: chat.agentPermanentId,
        };
        const chatMessages = resolveSerializableArray(chat.messages);
        const preferredFilename = ensureJsonFilename(
            createBackupStem(
                [userPreview?.username, agentPreview.agentName, normalizeOptionalText(chat.title), 'conversation'],
                `chat-${chat.id}`,
            ),
        );
        const filename = createUniqueBackupFilename(
            usedChatFilenames,
            preferredFilename,
            `chat-${chat.id}`,
        );
        const metadataFilename = createJsonMetadataFilename(filename);

        zip.file(`${chatsRootPath}/${filename}`, `${JSON.stringify(chatMessages, null, 2)}\n`);
        zip.file(
            `${chatsRootPath}/${metadataFilename}`,
            `${JSON.stringify(
                {
                    kind: 'user-chat',
                    chatId: chat.id,
                    title: chat.title,
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt,
                    lastMessageAt: chat.lastMessageAt,
                    source: chat.source,
                    draftMessage: chat.draftMessage,
                    messageCount: chatMessages.length,
                    user: userPreview,
                    agent: agentPreview,
                },
                null,
                2,
            )}\n`,
        );
    }

    for (const feedback of feedbackRows) {
        const { messages, rawChatThreadText } = resolveFeedbackThreadMessages(feedback.chatThread);
        const agentPreview = agentPreviewByName.get(feedback.agentName) || {
            id: 0,
            agentName: feedback.agentName,
            permanentId: null,
        };
        const preferredFilename = ensureJsonFilename(
            createBackupStem(
                [feedback.agentName, normalizeOptionalText(feedback.textRating), `feedback ${feedback.id}`],
                `feedback-${feedback.id}`,
            ),
        );
        const filename = createUniqueBackupFilename(
            usedFeedbackFilenames,
            preferredFilename,
            `feedback-${feedback.id}`,
        );
        const metadataFilename = createJsonMetadataFilename(filename);

        zip.file(`${feedbackRootPath}/${filename}`, `${JSON.stringify(messages, null, 2)}\n`);
        zip.file(
            `${feedbackRootPath}/${metadataFilename}`,
            `${JSON.stringify(
                {
                    kind: 'chat-feedback',
                    feedbackId: feedback.id,
                    createdAt: feedback.createdAt,
                    agent: agentPreview,
                    rating: feedback.rating,
                    textRating: feedback.textRating,
                    userNote: feedback.userNote,
                    expectedAnswer: feedback.expectedAnswer,
                    promptbookEngineVersion: feedback.promptbookEngineVersion,
                    url: feedback.url,
                    language: feedback.language,
                    platform: feedback.platform,
                    messageCount: messages.length,
                    ...(rawChatThreadText ? { rawChatThreadText } : {}),
                },
                null,
                2,
            )}\n`,
        );
    }
}
