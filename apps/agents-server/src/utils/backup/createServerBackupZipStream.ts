import JSZip from 'jszip';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';
import { appendBooksBackupEntriesToZip, type BooksBackupZipStream } from './createBooksBackupZipStream';
import { sanitizeBackupPathSegment } from './sanitizeBackupPathSegment';
import {
    DEFAULT_SERVER_BACKUP_SECTION_KEYS,
    SERVER_BACKUP_SECTION_DEFINITION_BY_KEY,
    type ServerBackupSectionDefinition,
    type ServerBackupSectionKey,
    normalizeServerBackupSectionKeys,
} from './serverBackupSections';

/**
 * ZIP filename prefix used for full or partial server backups.
 */
const SERVER_BACKUP_ROOT_PREFIX = 'promptbook-server-backup-';

/**
 * Stable archive format identifier for the user-facing backup layout.
 */
const SERVER_BACKUP_FORMAT = 'promptbook-server-backup/v2';

/**
 * Filename used for the flattened metadata and limits export.
 */
const METADATA_AND_LIMITS_FILENAME = 'metadata-and-limits.json';

/**
 * Filename used when a requested section intentionally exports no data.
 */
const EXCLUDED_SECTION_FILENAME = 'excluded.json';

/**
 * JSON file extension used by the per-entity exports.
 */
const JSON_FILE_EXTENSION = '.json';

/**
 * Typed row alias for `Agent`.
 */
type AgentRow = AgentsServerDatabase['public']['Tables']['Agent']['Row'];

/**
 * Typed row alias for `User`.
 */
type UserRow = AgentsServerDatabase['public']['Tables']['User']['Row'];

/**
 * Typed row alias for `UserChat`.
 */
type UserChatRow = AgentsServerDatabase['public']['Tables']['UserChat']['Row'];

/**
 * Typed row alias for `ChatFeedback`.
 */
type ChatFeedbackRow = AgentsServerDatabase['public']['Tables']['ChatFeedback']['Row'];

/**
 * Typed row alias for `Wallet`.
 */
type WalletRow = AgentsServerDatabase['public']['Tables']['Wallet']['Row'];

/**
 * JSON payload persisted for legacy table-backed exports.
 */
type BackupTableFilePayload = {
    /**
     * Logical entity name from the generated schema types.
     */
    readonly entity: keyof AgentsServerDatabase['public']['Tables'];
    /**
     * Physical table name used by the current server installation.
     */
    readonly databaseTable: string;
    /**
     * Total number of exported rows.
     */
    readonly rowCount: number;
    /**
     * Ordered snapshot rows.
     */
    readonly rows: ReadonlyArray<Record<string, unknown>>;
};

/**
 * High-level manifest written into every server backup ZIP.
 */
type ServerBackupManifest = {
    /**
     * Stable backup archive format identifier.
     */
    readonly format: typeof SERVER_BACKUP_FORMAT;
    /**
     * ISO timestamp when the archive was generated.
     */
    readonly generatedAt: string;
    /**
     * Whether the archive includes every default exportable section.
     */
    readonly isFullBackup: boolean;
    /**
     * Ordered list of exported section keys.
     */
    readonly selectedSections: ReadonlyArray<ServerBackupSectionKey>;
    /**
     * Human-readable section details for restore/debug tooling.
     */
    readonly sections: ReadonlyArray<{
        readonly key: ServerBackupSectionKey;
        readonly label: string;
        readonly description: string;
        readonly directoryName: string;
        readonly selectionKind: ServerBackupSectionDefinition['selectionKind'];
        readonly includesBooks: boolean;
    }>;
};

/**
 * Shared preview persisted for referenced users inside backup metadata files.
 */
type BackupUserPreview = {
    readonly id: number;
    readonly username: string;
    readonly isAdmin: boolean;
    readonly profileImageUrl: string | null;
};

/**
 * Shared preview persisted for referenced agents inside backup metadata files.
 */
type BackupAgentPreview = {
    readonly id: number;
    readonly agentName: string;
    readonly permanentId: string | null;
};

/**
 * Attachment reference stored alongside exported files/media metadata.
 */
type BackupAttachmentReference = {
    readonly source: 'user-chat' | 'chat-feedback';
    readonly messageIndex: number;
    readonly messageId: string | null;
    readonly attachmentName: string | null;
    readonly sender: unknown;
    readonly chatId?: string;
    readonly chatTitle?: string | null;
    readonly feedbackId?: number;
    readonly user?: BackupUserPreview | null;
    readonly agent?: BackupAgentPreview | null;
};

/**
 * Shared context with lazy-loaded table snapshots reused across multiple sections.
 */
type ServerBackupContext = {
    readonly supabase: ReturnType<typeof $provideSupabaseForServer>;
    userRowsPromise?: Promise<Array<UserRow>>;
    agentRowsPromise?: Promise<Array<AgentRow>>;
    userChatRowsPromise?: Promise<Array<UserChatRow>>;
    chatFeedbackRowsPromise?: Promise<Array<ChatFeedbackRow>>;
};

/**
 * Builds one ZIP archive containing the selected server entities plus the books backup tree when requested.
 *
 * @param requestedSectionKeys - Logical sections requested by the admin UI. Invalid or empty selections fall back to the default full backup.
 * @returns ZIP filename and stream payload.
 */
export async function createServerBackupZipStream(
    requestedSectionKeys: ReadonlyArray<string> = DEFAULT_SERVER_BACKUP_SECTION_KEYS,
): Promise<BooksBackupZipStream> {
    const context = createServerBackupContext($provideSupabaseForServer());
    const selectedSectionKeys = normalizeServerBackupSectionKeys(requestedSectionKeys);
    const selectedSectionDefinitions = selectedSectionKeys.flatMap((sectionKey) => {
        const definition = SERVER_BACKUP_SECTION_DEFINITION_BY_KEY.get(sectionKey);
        return definition ? [definition] : [];
    });
    const generatedAt = new Date().toISOString();
    const backupRootFolderName = `${SERVER_BACKUP_ROOT_PREFIX}${generatedAt.slice(0, 10)}`;
    const zip = new JSZip();

    zip.folder(backupRootFolderName);

    const appendBooksPromise = selectedSectionDefinitions.some(({ includesBooks }) => includesBooks)
        ? appendBooksBackupEntriesToZip(zip, `${backupRootFolderName}/books`)
        : Promise.resolve();
    const appendSectionsPromise = Promise.all(
        selectedSectionDefinitions.map((sectionDefinition) =>
            appendSectionEntriesToZip({
                zip,
                backupRootFolderName,
                sectionDefinition,
                context,
            }),
        ),
    );

    await Promise.all([appendBooksPromise, appendSectionsPromise]);

    const manifest: ServerBackupManifest = {
        format: SERVER_BACKUP_FORMAT,
        generatedAt,
        isFullBackup:
            selectedSectionKeys.length === DEFAULT_SERVER_BACKUP_SECTION_KEYS.length &&
            DEFAULT_SERVER_BACKUP_SECTION_KEYS.every(
                (sectionKey, index) => selectedSectionKeys[index] === sectionKey,
            ),
        selectedSections: selectedSectionKeys,
        sections: selectedSectionDefinitions.map(({ key, label, description, directoryName, selectionKind, includesBooks }) => ({
            key,
            label,
            description,
            directoryName,
            selectionKind,
            includesBooks,
        })),
    };

    zip.file(`${backupRootFolderName}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);

    const stream = zip.generateNodeStream({
        streamFiles: true,
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    });

    return {
        filename: `${backupRootFolderName}.zip`,
        stream,
    };
}

/**
 * Creates the shared backup context with lazy table loaders.
 *
 * @param supabase - Server-side Supabase client.
 * @returns Reusable backup context.
 */
function createServerBackupContext(
    supabase: ReturnType<typeof $provideSupabaseForServer>,
): ServerBackupContext {
    return {
        supabase,
    };
}

/**
 * Appends one selected section into the ZIP archive.
 *
 * @param options - Section append options.
 */
async function appendSectionEntriesToZip(options: {
    zip: JSZip;
    backupRootFolderName: string;
    sectionDefinition: ServerBackupSectionDefinition;
    context: ServerBackupContext;
}): Promise<void> {
    const { zip, backupRootFolderName, sectionDefinition, context } = options;
    const sectionRootPath = `${backupRootFolderName}/data/${sectionDefinition.directoryName}`;
    zip.folder(sectionRootPath);

    switch (sectionDefinition.key) {
        case 'metadata':
            await appendMetadataBackupEntriesToZip(zip, sectionRootPath, context);
            return;
        case 'agents':
            await appendAgentBackupEntriesToZip(zip, sectionRootPath, sectionDefinition, context);
            return;
        case 'conversations':
            await appendConversationBackupEntriesToZip(zip, sectionRootPath, context);
            return;
        case 'users':
            await appendUserBackupEntriesToZip(zip, sectionRootPath, context);
            return;
        case 'files':
            await appendFileBackupEntriesToZip(zip, sectionRootPath, context);
            return;
        case 'messages':
            await appendMessageBackupEntriesToZip(zip, sectionRootPath, context);
            return;
        case 'security':
        case 'caches':
            appendExcludedSectionNoteToZip(zip, sectionRootPath, sectionDefinition);
            return;
        default: {
            const exhaustiveSectionKey: never = sectionDefinition.key;
            throw new Error(`Unsupported backup section ${String(exhaustiveSectionKey)}.`);
        }
    }
}

/**
 * Writes the flattened metadata and limits file.
 *
 * @param zip - ZIP archive being assembled.
 * @param sectionRootPath - Root path for the metadata section.
 * @param context - Shared backup context.
 */
async function appendMetadataBackupEntriesToZip(
    zip: JSZip,
    sectionRootPath: string,
    context: ServerBackupContext,
): Promise<void> {
    const [metadataRows, serverLimitRows] = await Promise.all([
        loadTableRows(context.supabase, 'Metadata'),
        loadTableRows(context.supabase, 'ServerLimit'),
    ]);

    const keyValueEntries = [
        ...metadataRows.map((row) => [row.key, row.value] as const),
        ...serverLimitRows.map((row) => [row.key, row.value] as const),
    ].sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

    zip.file(
        `${sectionRootPath}/${METADATA_AND_LIMITS_FILENAME}`,
        `${JSON.stringify(Object.fromEntries(keyValueEntries), null, 2)}\n`,
    );
}

/**
 * Writes the legacy table-backed agent export while keeping the books tree unchanged.
 *
 * @param zip - ZIP archive being assembled.
 * @param sectionRootPath - Root path for the agents section.
 * @param sectionDefinition - Agents section definition.
 * @param context - Shared backup context.
 */
async function appendAgentBackupEntriesToZip(
    zip: JSZip,
    sectionRootPath: string,
    sectionDefinition: ServerBackupSectionDefinition,
    context: ServerBackupContext,
): Promise<void> {
    const tableKeys = sectionDefinition.tables || [];

    for (const tableKey of tableKeys) {
        const tablePayload = await loadBackupTableFilePayload(context.supabase, tableKey);
        zip.file(`${sectionRootPath}/${tableKey}.json`, `${JSON.stringify(tablePayload, null, 2)}\n`);
    }
}

/**
 * Writes one JSON chat export per conversation and per feedback thread.
 *
 * @param zip - ZIP archive being assembled.
 * @param sectionRootPath - Root path for the conversations section.
 * @param context - Shared backup context.
 */
async function appendConversationBackupEntriesToZip(
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

/**
 * Writes one JSON file per user with related memories, structured data, and redacted wallet entries.
 *
 * @param zip - ZIP archive being assembled.
 * @param sectionRootPath - Root path for the users section.
 * @param context - Shared backup context.
 */
async function appendUserBackupEntriesToZip(
    zip: JSZip,
    sectionRootPath: string,
    context: ServerBackupContext,
): Promise<void> {
    const [users, agents, memoryRows, userDataRows, walletRows] = await Promise.all([
        loadUserRows(context),
        loadAgentRows(context),
        loadTableRows(context.supabase, 'UserMemory'),
        loadTableRows(context.supabase, 'UserData'),
        loadTableRows(context.supabase, 'Wallet'),
    ]);
    const usedUserFilenames = new Set<string>();
    const agentPreviewByPermanentId = createAgentPreviewByPermanentId(agents);
    const memoryRowsByUserId = groupRowsBy(memoryRows, (row) => row.userId);
    const userDataRowsByUserId = groupRowsBy(userDataRows, (row) => row.userId);
    const walletRowsByUserId = groupRowsBy(walletRows, (row) => row.userId);

    for (const user of users) {
        const filename = createUniqueBackupFilename(
            usedUserFilenames,
            ensureJsonFilename(createBackupStem([user.username], `user-${user.id}`)),
            `user-${user.id}`,
        );
        const userMemoryRows = memoryRowsByUserId.get(user.id) || [];
        const scopedUserDataRows = userDataRowsByUserId.get(user.id) || [];
        const scopedWalletRows = walletRowsByUserId.get(user.id) || [];

        zip.file(
            `${sectionRootPath}/${filename}`,
            `${JSON.stringify(
                {
                    user: {
                        id: user.id,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                        username: user.username,
                        isAdmin: user.isAdmin,
                        profileImageUrl: user.profileImageUrl,
                    },
                    memories: userMemoryRows.map((row) => ({
                        id: row.id,
                        createdAt: row.createdAt,
                        updatedAt: row.updatedAt,
                        content: row.content,
                        isGlobal: row.isGlobal,
                        deletedAt: row.deletedAt,
                        agent: row.agentPermanentId ? agentPreviewByPermanentId.get(row.agentPermanentId) || null : null,
                    })),
                    data: scopedUserDataRows.map((row) => ({
                        id: row.id,
                        createdAt: row.createdAt,
                        updatedAt: row.updatedAt,
                        key: row.key,
                        value: row.value,
                    })),
                    wallet: scopedWalletRows.map((row) => createRedactedWalletBackupRecord(row, agentPreviewByPermanentId)),
                },
                null,
                2,
            )}\n`,
        );
    }
}

/**
 * Writes uploaded files and generated images together with sidecar restore metadata.
 *
 * @param zip - ZIP archive being assembled.
 * @param sectionRootPath - Root path for the files section.
 * @param context - Shared backup context.
 */
async function appendFileBackupEntriesToZip(
    zip: JSZip,
    sectionRootPath: string,
    context: ServerBackupContext,
): Promise<void> {
    const [fileRows, imageRows, users, agents, userChats, feedbackRows] = await Promise.all([
        loadTableRows(context.supabase, 'File'),
        loadTableRows(context.supabase, 'Image'),
        loadUserRows(context),
        loadAgentRows(context),
        loadUserChatRows(context),
        loadChatFeedbackRows(context),
    ]);
    const uploadsRootPath = `${sectionRootPath}/uploads`;
    const imagesRootPath = `${sectionRootPath}/images`;
    const usedUploadFilenames = new Set<string>();
    const usedImageFilenames = new Set<string>();
    const userPreviewById = createUserPreviewById(users);
    const agentPreviewById = createAgentPreviewById(agents);
    const agentPreviewByPermanentId = createAgentPreviewByPermanentId(agents);
    const agentPreviewByName = createAgentPreviewByName(agents);
    const attachmentReferencesByUrl = createAttachmentReferencesByUrl({
        userChats,
        feedbackRows,
        userPreviewById,
        agentPreviewByPermanentId,
        agentPreviewByName,
    });

    zip.folder(uploadsRootPath);
    zip.folder(imagesRootPath);

    for (const fileRow of fileRows) {
        const contentUrl = normalizeOptionalText(fileRow.storageUrl) || normalizeOptionalText(fileRow.shortUrl);
        const filename = createUniqueBackupFilename(
            usedUploadFilenames,
            resolveBinaryBackupFilename(fileRow.fileName, contentUrl, `file-${fileRow.id}`),
            `file-${fileRow.id}`,
        );
        const downloadResult = await downloadBackupBinaryContent(contentUrl);
        const attachedToMessages = deduplicateSerializableObjects(
            resolveAttachmentReferencesForUrls(
                attachmentReferencesByUrl,
                [fileRow.storageUrl, fileRow.shortUrl],
            ),
        );

        if (downloadResult.content) {
            zip.file(`${uploadsRootPath}/${filename}`, downloadResult.content);
        }

        zip.file(
            `${uploadsRootPath}/${createBinaryMetadataFilename(filename)}`,
            `${JSON.stringify(
                {
                    kind: 'uploaded-file',
                    id: fileRow.id,
                    createdAt: fileRow.createdAt,
                    originalFileName: resolvePathBasename(fileRow.fileName, `file-${fileRow.id}`),
                    fileType: fileRow.fileType,
                    fileSize: fileRow.fileSize,
                    purpose: fileRow.purpose,
                    status: fileRow.status,
                    uploadedBy: typeof fileRow.userId === 'number' ? userPreviewById.get(fileRow.userId) || null : null,
                    agent: typeof fileRow.agentId === 'number' ? agentPreviewById.get(fileRow.agentId) || null : null,
                    attachedToMessages,
                    contentUrl,
                    contentIncluded: Boolean(downloadResult.content),
                    ...(downloadResult.error ? { contentDownloadError: downloadResult.error } : {}),
                },
                null,
                2,
            )}\n`,
        );
    }

    for (const imageRow of imageRows) {
        const filename = createUniqueBackupFilename(
            usedImageFilenames,
            resolveBinaryBackupFilename(imageRow.filename, imageRow.cdnUrl, `image-${imageRow.id}`),
            `image-${imageRow.id}`,
        );
        const downloadResult = await downloadBackupBinaryContent(imageRow.cdnUrl);

        if (downloadResult.content) {
            zip.file(`${imagesRootPath}/${filename}`, downloadResult.content);
        }

        zip.file(
            `${imagesRootPath}/${createBinaryMetadataFilename(filename)}`,
            `${JSON.stringify(
                {
                    kind: 'generated-image',
                    id: imageRow.id,
                    createdAt: imageRow.createdAt,
                    updatedAt: imageRow.updatedAt,
                    filename: imageRow.filename,
                    prompt: imageRow.prompt,
                    purpose: imageRow.purpose,
                    agent: typeof imageRow.agentId === 'number' ? agentPreviewById.get(imageRow.agentId) || null : null,
                    contentUrl: imageRow.cdnUrl,
                    contentIncluded: Boolean(downloadResult.content),
                    ...(downloadResult.error ? { contentDownloadError: downloadResult.error } : {}),
                },
                null,
                2,
            )}\n`,
        );
    }
}

/**
 * Writes one JSON file per system message with delivery history.
 *
 * @param zip - ZIP archive being assembled.
 * @param sectionRootPath - Root path for the messages section.
 * @param context - Shared backup context.
 */
async function appendMessageBackupEntriesToZip(
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

/**
 * Writes the explanatory note for a section that is intentionally excluded from the archive.
 *
 * @param zip - ZIP archive being assembled.
 * @param sectionRootPath - Root path for the excluded section.
 * @param sectionDefinition - Excluded section definition.
 */
function appendExcludedSectionNoteToZip(
    zip: JSZip,
    sectionRootPath: string,
    sectionDefinition: ServerBackupSectionDefinition,
): void {
    zip.file(
        `${sectionRootPath}/${EXCLUDED_SECTION_FILENAME}`,
        `${JSON.stringify(
            {
                key: sectionDefinition.key,
                label: sectionDefinition.label,
                included: false,
                reason: sectionDefinition.description,
            },
            null,
            2,
        )}\n`,
    );
}

/**
 * Reads one logical table and converts it into a deterministic JSON backup payload.
 *
 * @param supabase - Server-side Supabase client.
 * @param tableKey - Logical table key from the generated schema.
 * @returns Serializable table payload for the archive.
 */
async function loadBackupTableFilePayload(
    supabase: ReturnType<typeof $provideSupabaseForServer>,
    tableKey: keyof AgentsServerDatabase['public']['Tables'],
): Promise<BackupTableFilePayload> {
    const tableName = await $getTableName(tableKey);
    const result = await supabase.from(tableName).select('*');

    if (result.error) {
        throw new Error(`Unable to load backup table ${tableKey}: ${result.error.message}`);
    }

    const rows = sortBackupRows(
        (((result.data || []) as unknown as Array<Record<string, unknown>>).map((row) => ({ ...row }))),
    );

    return {
        entity: tableKey,
        databaseTable: tableName,
        rowCount: rows.length,
        rows,
    };
}

/**
 * Reads one logical table into typed rows.
 *
 * @param supabase - Server-side Supabase client.
 * @param tableKey - Logical table key from the generated schema.
 * @returns Ordered table rows.
 */
async function loadTableRows<TableKey extends keyof AgentsServerDatabase['public']['Tables']>(
    supabase: ReturnType<typeof $provideSupabaseForServer>,
    tableKey: TableKey,
): Promise<Array<AgentsServerDatabase['public']['Tables'][TableKey]['Row']>> {
    const tableName = await $getTableName(tableKey);
    const result = await supabase.from(tableName).select('*');

    if (result.error) {
        throw new Error(`Unable to load backup table ${String(tableKey)}: ${result.error.message}`);
    }

    return sortBackupRows((result.data || []) as unknown as Array<Record<string, unknown>>) as Array<
        AgentsServerDatabase['public']['Tables'][TableKey]['Row']
    >;
}

/**
 * Lazily loads users once for the backup run.
 *
 * @param context - Shared backup context.
 * @returns Cached user rows.
 */
function loadUserRows(context: ServerBackupContext): Promise<Array<UserRow>> {
    context.userRowsPromise = context.userRowsPromise || loadTableRows(context.supabase, 'User');
    return context.userRowsPromise;
}

/**
 * Lazily loads agents once for the backup run.
 *
 * @param context - Shared backup context.
 * @returns Cached agent rows.
 */
function loadAgentRows(context: ServerBackupContext): Promise<Array<AgentRow>> {
    context.agentRowsPromise = context.agentRowsPromise || loadTableRows(context.supabase, 'Agent');
    return context.agentRowsPromise;
}

/**
 * Lazily loads user chats once for the backup run.
 *
 * @param context - Shared backup context.
 * @returns Cached user-chat rows.
 */
function loadUserChatRows(context: ServerBackupContext): Promise<Array<UserChatRow>> {
    context.userChatRowsPromise = context.userChatRowsPromise || loadTableRows(context.supabase, 'UserChat');
    return context.userChatRowsPromise;
}

/**
 * Lazily loads feedback rows once for the backup run.
 *
 * @param context - Shared backup context.
 * @returns Cached feedback rows.
 */
function loadChatFeedbackRows(context: ServerBackupContext): Promise<Array<ChatFeedbackRow>> {
    context.chatFeedbackRowsPromise = context.chatFeedbackRowsPromise || loadTableRows(context.supabase, 'ChatFeedback');
    return context.chatFeedbackRowsPromise;
}

/**
 * Builds the user preview map reused across metadata sidecars.
 *
 * @param users - Full user rows.
 * @returns User preview map keyed by numeric id.
 */
function createUserPreviewById(users: ReadonlyArray<UserRow>): Map<number, BackupUserPreview> {
    return new Map(
        users.map((user) => [
            user.id,
            {
                id: user.id,
                username: user.username,
                isAdmin: user.isAdmin,
                profileImageUrl: user.profileImageUrl,
            } satisfies BackupUserPreview,
        ] as const),
    );
}

/**
 * Builds the agent preview map keyed by numeric id.
 *
 * @param agents - Full agent rows.
 * @returns Agent preview map keyed by numeric id.
 */
function createAgentPreviewById(agents: ReadonlyArray<AgentRow>): Map<number, BackupAgentPreview> {
    return new Map(
        agents.map((agent) => [
            agent.id,
            {
                id: agent.id,
                agentName: agent.agentName,
                permanentId: agent.permanentId,
            } satisfies BackupAgentPreview,
        ] as const),
    );
}

/**
 * Builds the agent preview map keyed by permanent id.
 *
 * @param agents - Full agent rows.
 * @returns Agent preview map keyed by permanent id.
 */
function createAgentPreviewByPermanentId(agents: ReadonlyArray<AgentRow>): Map<string, BackupAgentPreview> {
    return new Map(
        agents.flatMap((agent) =>
            agent.permanentId
                ? [
                      [
                          agent.permanentId,
                          {
                              id: agent.id,
                              agentName: agent.agentName,
                              permanentId: agent.permanentId,
                          } satisfies BackupAgentPreview,
                      ] as const,
                  ]
                : [],
        ),
    );
}

/**
 * Builds the first-agent-by-name preview map used by feedback sidecars.
 *
 * @param agents - Full agent rows.
 * @returns Agent preview map keyed by agent name.
 */
function createAgentPreviewByName(agents: ReadonlyArray<AgentRow>): Map<string, BackupAgentPreview> {
    const agentPreviewByName = new Map<string, BackupAgentPreview>();

    for (const agent of agents) {
        if (agentPreviewByName.has(agent.agentName)) {
            continue;
        }

        agentPreviewByName.set(agent.agentName, {
            id: agent.id,
            agentName: agent.agentName,
            permanentId: agent.permanentId,
        });
    }

    return agentPreviewByName;
}

/**
 * Builds one map of attachment URLs to the user-facing messages that reference them.
 *
 * @param options - Attachment map source data.
 * @returns Attachment references keyed by URL.
 */
function createAttachmentReferencesByUrl(options: {
    userChats: ReadonlyArray<UserChatRow>;
    feedbackRows: ReadonlyArray<ChatFeedbackRow>;
    userPreviewById: ReadonlyMap<number, BackupUserPreview>;
    agentPreviewByPermanentId: ReadonlyMap<string, BackupAgentPreview>;
    agentPreviewByName: ReadonlyMap<string, BackupAgentPreview>;
}): Map<string, Array<BackupAttachmentReference>> {
    const attachmentReferencesByUrl = new Map<string, Array<BackupAttachmentReference>>();

    const appendReference = (url: string, reference: BackupAttachmentReference): void => {
        const references = attachmentReferencesByUrl.get(url) || [];
        references.push(reference);
        attachmentReferencesByUrl.set(url, references);
    };

    for (const chat of options.userChats) {
        const userPreview = options.userPreviewById.get(chat.userId) || null;
        const agentPreview = options.agentPreviewByPermanentId.get(chat.agentPermanentId) || null;

        for (const [messageIndex, message] of resolveSerializableArray(chat.messages).entries()) {
            for (const attachment of resolveMessageAttachments(message)) {
                appendReference(attachment.url, {
                    source: 'user-chat',
                    chatId: chat.id,
                    chatTitle: chat.title,
                    messageIndex,
                    messageId: normalizeOptionalText((message as { id?: unknown }).id),
                    attachmentName: attachment.name,
                    sender: (message as { sender?: unknown }).sender ?? null,
                    user: userPreview,
                    agent: agentPreview,
                });
            }
        }
    }

    for (const feedbackRow of options.feedbackRows) {
        const agentPreview = options.agentPreviewByName.get(feedbackRow.agentName) || null;
        const { messages } = resolveFeedbackThreadMessages(feedbackRow.chatThread);

        for (const [messageIndex, message] of messages.entries()) {
            for (const attachment of resolveMessageAttachments(message)) {
                appendReference(attachment.url, {
                    source: 'chat-feedback',
                    feedbackId: feedbackRow.id,
                    messageIndex,
                    messageId: normalizeOptionalText((message as { id?: unknown }).id),
                    attachmentName: attachment.name,
                    sender: (message as { sender?: unknown }).sender ?? null,
                    agent: agentPreview,
                });
            }
        }
    }

    return attachmentReferencesByUrl;
}

/**
 * Resolves attachment references for the provided URLs.
 *
 * @param attachmentReferencesByUrl - Attachment reference map keyed by URL.
 * @param candidateUrls - Possible URLs for one backed-up file.
 * @returns Flattened reference list.
 */
function resolveAttachmentReferencesForUrls(
    attachmentReferencesByUrl: ReadonlyMap<string, ReadonlyArray<BackupAttachmentReference>>,
    candidateUrls: ReadonlyArray<string | null>,
): Array<BackupAttachmentReference> {
    const references: Array<BackupAttachmentReference> = [];

    for (const candidateUrl of candidateUrls) {
        const normalizedUrl = normalizeOptionalText(candidateUrl);
        if (!normalizedUrl) {
            continue;
        }

        const matches = attachmentReferencesByUrl.get(normalizedUrl) || [];
        references.push(...matches);
    }

    return references;
}

/**
 * Parses the persisted feedback chat thread into the same array shape used by chat JSON exports.
 *
 * @param rawChatThread - Raw persisted feedback thread.
 * @returns Parsed chat messages together with an optional raw fallback string.
 */
function resolveFeedbackThreadMessages(rawChatThread: unknown): {
    messages: Array<Record<string, unknown>>;
    rawChatThreadText: string | null;
} {
    if (Array.isArray(rawChatThread)) {
        return {
            messages: rawChatThread.filter(isRecord),
            rawChatThreadText: null,
        };
    }

    if (typeof rawChatThread !== 'string') {
        return {
            messages: [],
            rawChatThreadText: null,
        };
    }

    const normalizedChatThreadText = rawChatThread.trim();
    if (normalizedChatThreadText.length === 0) {
        return {
            messages: [],
            rawChatThreadText: null,
        };
    }

    try {
        const parsed = JSON.parse(normalizedChatThreadText);
        if (Array.isArray(parsed)) {
            return {
                messages: parsed.filter(isRecord),
                rawChatThreadText: null,
            };
        }
    } catch {
        // Keep the original text below so the backup still preserves the source thread payload.
    }

    return {
        messages: [],
        rawChatThreadText: normalizedChatThreadText,
    };
}

/**
 * Extracts normalized attachment previews from one serialized chat message.
 *
 * @param message - One serialized chat message candidate.
 * @returns Normalized attachment previews with required URLs.
 */
function resolveMessageAttachments(message: Record<string, unknown>): Array<{
    name: string | null;
    url: string;
}> {
    const rawAttachments = message.attachments;
    if (!Array.isArray(rawAttachments)) {
        return [];
    }

    return rawAttachments.flatMap((attachment) => {
        if (!attachment || typeof attachment !== 'object' || Array.isArray(attachment)) {
            return [];
        }

        const url = normalizeOptionalText((attachment as { url?: unknown }).url);
        if (!url) {
            return [];
        }

        return [
            {
                name: normalizeOptionalText((attachment as { name?: unknown }).name),
                url,
            },
        ];
    });
}

/**
 * Creates the redacted wallet representation written into per-user backups.
 *
 * @param walletRow - Persisted wallet row.
 * @param agentPreviewByPermanentId - Agent preview lookup for scoped records.
 * @returns Redacted wallet record safe for backup export.
 */
function createRedactedWalletBackupRecord(
    walletRow: WalletRow,
    agentPreviewByPermanentId: ReadonlyMap<string, BackupAgentPreview>,
): Record<string, unknown> {
    return {
        id: walletRow.id,
        createdAt: walletRow.createdAt,
        updatedAt: walletRow.updatedAt,
        isUserScoped: walletRow.isUserScoped,
        isGlobal: walletRow.isGlobal,
        deletedAt: walletRow.deletedAt,
        recordType: walletRow.recordType,
        service: walletRow.service,
        key: walletRow.key,
        jsonSchema: walletRow.jsonSchema,
        username: walletRow.username,
        agent: walletRow.agentPermanentId ? agentPreviewByPermanentId.get(walletRow.agentPermanentId) || null : null,
        hasPassword: Boolean(normalizeOptionalText(walletRow.password)),
        hasSecret: Boolean(normalizeOptionalText(walletRow.secret)),
        hasCookies: Boolean(normalizeOptionalText(walletRow.cookies)),
    };
}

/**
 * Downloads one binary file for backup inclusion.
 *
 * @param url - Public binary URL to fetch.
 * @returns Download result with either binary content or an explanatory error.
 */
async function downloadBackupBinaryContent(url: string | null): Promise<{
    content: ArrayBuffer | null;
    error: string | null;
}> {
    if (!url) {
        return {
            content: null,
            error: 'Missing content URL.',
        };
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            return {
                content: null,
                error: `Failed to download content (${response.status} ${response.statusText}).`,
            };
        }

        return {
            content: await response.arrayBuffer(),
            error: null,
        };
    } catch (error) {
        return {
            content: null,
            error: error instanceof Error ? error.message : 'Unknown download error.',
        };
    }
}

/**
 * Resolves the preferred binary backup filename while keeping the original file extension when available.
 *
 * @param fileName - Stored filename/path.
 * @param fallbackUrl - Public file URL used when the filename is empty.
 * @param fallbackStem - Deterministic fallback stem.
 * @returns Safe filename for the ZIP archive.
 */
function resolveBinaryBackupFilename(
    fileName: string | null | undefined,
    fallbackUrl: string | null | undefined,
    fallbackStem: string,
): string {
    const rawBaseName =
        resolvePathBasename(fileName, '') ||
        resolvePathBasename(fallbackUrl, '') ||
        fallbackStem;

    return sanitizeBackupPathSegment(rawBaseName, fallbackStem);
}

/**
 * Creates one human-readable backup filename stem from optional labels.
 *
 * @param labels - Preferred labels ordered by importance.
 * @param fallbackStem - Deterministic fallback stem.
 * @returns Safe filename stem without extension.
 */
function createBackupStem(
    labels: ReadonlyArray<string | null | undefined>,
    fallbackStem: string,
): string {
    const normalizedLabels = labels
        .map((label) => normalizeOptionalText(label))
        .filter((label): label is string => Boolean(label));

    return sanitizeBackupPathSegment(
        normalizedLabels.length > 0 ? normalizedLabels.join(' -- ') : fallbackStem,
        fallbackStem,
    );
}

/**
 * Ensures one filename ends with `.json`.
 *
 * @param filenameStem - Filename stem or full filename.
 * @returns JSON filename.
 */
function ensureJsonFilename(filenameStem: string): string {
    return filenameStem.endsWith(JSON_FILE_EXTENSION) ? filenameStem : `${filenameStem}${JSON_FILE_EXTENSION}`;
}

/**
 * Creates the metadata sidecar filename for a JSON export file.
 *
 * @param jsonFilename - Main JSON filename.
 * @returns Sidecar metadata filename.
 */
function createJsonMetadataFilename(jsonFilename: string): string {
    return jsonFilename.endsWith(JSON_FILE_EXTENSION)
        ? `${jsonFilename.slice(0, -JSON_FILE_EXTENSION.length)}.metadata.json`
        : `${jsonFilename}.metadata.json`;
}

/**
 * Creates the metadata sidecar filename for a binary export file.
 *
 * @param filename - Main binary filename.
 * @returns Sidecar metadata filename.
 */
function createBinaryMetadataFilename(filename: string): string {
    return `${filename}.metadata.json`;
}

/**
 * Creates a unique filename inside one ZIP folder with deterministic suffixes.
 *
 * @param usedFilenames - Already allocated filenames in the folder.
 * @param filename - Preferred filename candidate.
 * @param suffixBase - Deterministic suffix base used on collisions.
 * @returns Unique filename for the ZIP folder.
 */
function createUniqueBackupFilename(
    usedFilenames: Set<string>,
    filename: string,
    suffixBase: string,
): string {
    if (!usedFilenames.has(filename)) {
        usedFilenames.add(filename);
        return filename;
    }

    const extensionIndex = filename.lastIndexOf('.');
    const hasExtension = extensionIndex > 0;
    const filenameBase = hasExtension ? filename.slice(0, extensionIndex) : filename;
    const extension = hasExtension ? filename.slice(extensionIndex) : '';

    for (let suffixIndex = 0; suffixIndex < Number.MAX_SAFE_INTEGER; suffixIndex += 1) {
        const suffix = suffixIndex === 0 ? `--${suffixBase}` : `--${suffixBase}-${suffixIndex + 1}`;
        const nextFilename = `${filenameBase}${suffix}${extension}`;

        if (!usedFilenames.has(nextFilename)) {
            usedFilenames.add(nextFilename);
            return nextFilename;
        }
    }

    throw new Error(`Unable to allocate unique backup filename for ${suffixBase}.`);
}

/**
 * Resolves the basename from a stored path or URL.
 *
 * @param value - Stored path or URL.
 * @param fallback - Fallback filename when no basename exists.
 * @returns Basename without parent directories or query strings.
 */
function resolvePathBasename(value: string | null | undefined, fallback: string): string {
    const normalizedValue = normalizeOptionalText(value);
    if (!normalizedValue) {
        return fallback;
    }

    try {
        const url = new URL(normalizedValue);
        const urlPathSegments = url.pathname.split('/').filter(Boolean);
        const urlBaseName = urlPathSegments[urlPathSegments.length - 1];
        if (urlBaseName) {
            return decodeURIComponent(urlBaseName);
        }
    } catch {
        // Continue with plain path parsing below.
    }

    const pathSegments = normalizedValue.split(/[\\/]/).filter(Boolean);
    return pathSegments[pathSegments.length - 1] || fallback;
}

/**
 * Groups rows by a computed key.
 *
 * @param rows - Rows to group.
 * @param getKey - Key selector.
 * @returns Grouped rows keyed by the computed value.
 */
function groupRowsBy<Row, Key extends string | number>(
    rows: ReadonlyArray<Row>,
    getKey: (row: Row) => Key,
): Map<Key, Array<Row>> {
    const rowsByKey = new Map<Key, Array<Row>>();

    for (const row of rows) {
        const key = getKey(row);
        const groupedRows = rowsByKey.get(key) || [];
        groupedRows.push(row);
        rowsByKey.set(key, groupedRows);
    }

    return rowsByKey;
}

/**
 * Converts one unknown persisted message array into serializable objects.
 *
 * @param value - Raw message array candidate.
 * @returns Serializable message array.
 */
function resolveSerializableArray(value: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter(isRecord);
}

/**
 * Type guard for plain objects used throughout the backup builders.
 *
 * @param value - Unknown value.
 * @returns `true` when the value is a non-array object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Deduplicates JSON-serializable objects using their serialized representation.
 *
 * @param values - Serializable objects.
 * @returns Deduplicated object list in first-seen order.
 */
function deduplicateSerializableObjects<Value extends object>(values: ReadonlyArray<Value>): Array<Value> {
    const seenSerializedValues = new Set<string>();
    const deduplicatedValues: Array<Value> = [];

    for (const value of values) {
        const serializedValue = JSON.stringify(value);
        if (seenSerializedValues.has(serializedValue)) {
            continue;
        }

        seenSerializedValues.add(serializedValue);
        deduplicatedValues.push(value);
    }

    return deduplicatedValues;
}

/**
 * Normalizes one optional text field to a trimmed string or `null`.
 *
 * @param value - Raw value.
 * @returns Trimmed text or `null`.
 */
function normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
}

/**
 * Sorts exported rows so JSON files remain stable and easier to diff.
 *
 * @param rows - Raw table rows fetched from Supabase.
 * @returns Sorted shallow-cloned row list.
 */
function sortBackupRows(rows: ReadonlyArray<Record<string, unknown>>): Array<Record<string, unknown>> {
    return [...rows].sort(compareBackupRows);
}

/**
 * Compares two generic backup rows using the most common stable identifier fields.
 *
 * @param left - First row.
 * @param right - Second row.
 * @returns Stable ordering for backup JSON output.
 */
function compareBackupRows(left: Record<string, unknown>, right: Record<string, unknown>): number {
    const comparableKeys = ['sortOrder', 'id', 'key', 'username', 'agentName', 'permanentId', 'messageHash', 'createdAt'];

    for (const comparableKey of comparableKeys) {
        const comparison = compareComparableValues(left[comparableKey], right[comparableKey]);

        if (comparison !== 0) {
            return comparison;
        }
    }

    return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

/**
 * Compares one optional pair of identifier values.
 *
 * @param left - First value.
 * @param right - Second value.
 * @returns Comparison result compatible with `Array.sort`.
 */
function compareComparableValues(left: unknown, right: unknown): number {
    if (left === right) {
        return 0;
    }

    if (typeof left === 'number' && typeof right === 'number') {
        return left - right;
    }

    if (left === undefined || left === null) {
        return 1;
    }

    if (right === undefined || right === null) {
        return -1;
    }

    return String(left).localeCompare(String(right));
}
