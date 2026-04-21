import { afterEach, describe, expect, it, jest } from '@jest/globals';
import JSZip from 'jszip';
import { $getTableName } from '../../database/$getTableName';
import { $provideSupabaseForServer } from '../../database/$provideSupabaseForServer';
import type { AgentsServerDatabase } from '../../database/schema';
import { createServerBackupZipStream } from './createServerBackupZipStream';

jest.mock('../../database/$getTableName', () => ({
    $getTableName: jest.fn(),
}));

jest.mock('../../database/$provideSupabaseForServer', () => ({
    $provideSupabaseForServer: jest.fn(),
}));

/**
 * Mocked table-name resolver used by backup ZIP tests.
 */
const getTableNameMock = $getTableName as jest.MockedFunction<typeof $getTableName>;

/**
 * Mocked Supabase provider used by backup ZIP tests.
 */
const provideSupabaseForServerMock = $provideSupabaseForServer as jest.MockedFunction<typeof $provideSupabaseForServer>;

/**
 * Logical database table key helper reused across backup tests.
 */
type BackupTableKey = keyof AgentsServerDatabase['public']['Tables'];

/**
 * Minimal Supabase table result shape accepted by the backup utilities.
 */
type SupabaseSelectResult = {
    readonly data: unknown;
    readonly error: { message: string } | null;
};

/**
 * Builds one simple Supabase mock that serves static table snapshots by table name.
 *
 * @param resultsByTableName - Export rows keyed by physical table name.
 * @returns Minimal mock compatible with `.from(...).select(...)`.
 */
function createSupabaseMock(resultsByTableName: Readonly<Record<string, SupabaseSelectResult>>) {
    const from = jest.fn((tableName: string) => ({
        select: jest.fn(async () => resultsByTableName[tableName] || { data: [], error: null }),
    }));

    return { from };
}

/**
 * Consumes one Node stream into a single buffer.
 *
 * @param stream - ZIP stream returned by the backup utility.
 * @returns Full in-memory archive bytes.
 */
async function readStreamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];

        stream.on('data', (chunk: Buffer | string) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        stream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        stream.on('error', reject);
    });
}

/**
 * Creates one consistent table-name mock and Supabase dataset for the given logical rows.
 *
 * @param tableRowsByKey - Logical rows keyed by schema table name.
 */
function mockBackupTables(
    tableRowsByKey: Readonly<Partial<Record<BackupTableKey, ReadonlyArray<Record<string, unknown>>>>>,
): void {
    const resultsByTableName: Record<string, SupabaseSelectResult> = {};

    getTableNameMock.mockImplementation(async (tableKey) => `server_${String(tableKey)}` as never);

    for (const [tableKey, rows] of Object.entries(tableRowsByKey)) {
        resultsByTableName[`server_${tableKey}`] = {
            data: rows || [],
            error: null,
        };
    }

    provideSupabaseForServerMock.mockReturnValue(createSupabaseMock(resultsByTableName) as never);
}

describe('createServerBackupZipStream', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    it('writes the selected metadata and agents sections into one ZIP archive with a v2 manifest and the existing books tree', async () => {
        mockBackupTables({
            Metadata: [
                {
                    id: 2,
                    key: 'SERVER_LANGUAGE',
                    value: 'en',
                    createdAt: '2026-04-01T00:00:00.000Z',
                    updatedAt: '2026-04-01T00:00:00.000Z',
                    note: null,
                },
                {
                    id: 1,
                    key: 'SERVER_NAME',
                    value: 'Promptbook',
                    createdAt: '2026-04-01T00:00:00.000Z',
                    updatedAt: '2026-04-01T00:00:00.000Z',
                    note: null,
                },
            ],
            ServerLimit: [
                {
                    id: 1,
                    key: 'MAX_FILE_UPLOAD_SIZE_MB',
                    value: 25,
                    createdAt: '2026-04-01T00:00:00.000Z',
                    updatedAt: '2026-04-01T00:00:00.000Z',
                },
            ],
            Agent: [
                {
                    id: 10,
                    agentName: 'Helper',
                    createdAt: '2026-04-01T00:00:00.000Z',
                    updatedAt: '2026-04-01T00:00:00.000Z',
                    permanentId: 'helper-1',
                    agentHash: 'hash-helper',
                    agentSource: 'PERSONA Helpful helper',
                    agentProfile: {},
                    promptbookEngineVersion: '1.0.0',
                    usage: null,
                    preparedModelRequirements: null,
                    folderId: 5,
                    sortOrder: 0,
                    deletedAt: null,
                    visibility: 'PUBLIC',
                },
            ],
            AgentFolder: [
                {
                    id: 5,
                    name: 'Support',
                    parentId: null,
                    createdAt: '2026-04-01T00:00:00.000Z',
                    updatedAt: '2026-04-01T00:00:00.000Z',
                    deletedAt: null,
                    sortOrder: 0,
                    icon: null,
                    color: null,
                },
            ],
            AgentHistory: [
                {
                    id: 1,
                    createdAt: '2026-04-01T00:00:00.000Z',
                    agentName: 'Helper',
                    permanentId: 'helper-1',
                    agentHash: 'hash-helper',
                    previousAgentHash: null,
                    agentSource: 'PERSONA Helpful helper',
                    promptbookEngineVersion: '1.0.0',
                    versionName: 'Initial',
                },
            ],
            AgentExternals: [
                {
                    id: 1,
                    createdAt: '2026-04-01T00:00:00.000Z',
                    updatedAt: '2026-04-01T00:00:00.000Z',
                    type: 'remote',
                    hash: 'abc',
                    externalId: 'ext-1',
                    vendor: 'demo',
                    note: null,
                },
            ],
        });

        const { filename, stream } = await createServerBackupZipStream(['agents', 'metadata']);
        const archiveBuffer = await readStreamToBuffer(stream);
        const zip = await JSZip.loadAsync(archiveBuffer);
        const archiveRoot = filename.replace(/\.zip$/, '');

        expect(filename).toMatch(/^promptbook-server-backup-\d{4}-\d{2}-\d{2}\.zip$/);

        const manifest = JSON.parse(await zip.file(`${archiveRoot}/manifest.json`)!.async('string')) as {
            format: string;
            selectedSections: string[];
            isFullBackup: boolean;
        };
        expect(manifest.format).toBe('promptbook-server-backup/v2');
        expect(manifest.selectedSections).toEqual(['metadata', 'agents']);
        expect(manifest.isFullBackup).toBe(false);

        expect(await zip.file(`${archiveRoot}/books/Support/Helper.book`)!.async('string')).toBe('PERSONA Helpful helper');

        const metadataPayload = JSON.parse(
            await zip.file(`${archiveRoot}/data/metadata/metadata-and-limits.json`)!.async('string'),
        ) as Record<string, string | number>;
        expect(metadataPayload).toEqual({
            MAX_FILE_UPLOAD_SIZE_MB: 25,
            SERVER_LANGUAGE: 'en',
            SERVER_NAME: 'Promptbook',
        });

        const agentPayload = JSON.parse(await zip.file(`${archiveRoot}/data/agents/Agent.json`)!.async('string')) as {
            databaseTable: string;
            rows: Array<{ permanentId: string; folderId: number }>;
        };
        expect(agentPayload.databaseTable).toBe('server_Agent');
        expect(
            agentPayload.rows.map(({ permanentId, folderId }) => ({ permanentId, folderId })),
        ).toEqual([{ permanentId: 'helper-1', folderId: 5 }]);
        expect(zip.file(`${archiveRoot}/data/conversations/chats`)).toBeNull();
    });

    it('exports user-facing conversations, redacted users, media sidecars, and per-message JSON files', async () => {
        mockBackupTables({
            Agent: [
                {
                    id: 10,
                    agentName: 'Helper',
                    createdAt: '2026-04-01T00:00:00.000Z',
                    updatedAt: '2026-04-01T00:00:00.000Z',
                    permanentId: 'helper-1',
                    agentHash: 'hash-helper',
                    agentSource: 'PERSONA Helpful helper',
                    agentProfile: {},
                    promptbookEngineVersion: '1.0.0',
                    usage: null,
                    preparedModelRequirements: null,
                    folderId: null,
                    sortOrder: 0,
                    deletedAt: null,
                    visibility: 'PUBLIC',
                },
            ],
            User: [
                {
                    id: 7,
                    createdAt: '2026-04-01T00:00:00.000Z',
                    updatedAt: '2026-04-01T00:00:00.000Z',
                    username: 'alice',
                    passwordHash: 'hashed-password',
                    isAdmin: true,
                    profileImageUrl: 'https://cdn.example.com/alice.png',
                },
            ],
            UserChat: [
                {
                    id: 'chat-1',
                    createdAt: '2026-04-02T00:00:00.000Z',
                    updatedAt: '2026-04-02T00:05:00.000Z',
                    lastMessageAt: '2026-04-02T00:05:00.000Z',
                    title: 'Incident',
                    userId: 7,
                    agentPermanentId: 'helper-1',
                    source: 'WEB_UI',
                    messages: [
                        {
                            id: 'message-1',
                            sender: 'USER',
                            content: 'See attachment',
                            attachments: [
                                {
                                    name: 'budget.xlsx',
                                    type: 'application/vnd.ms-excel',
                                    url: 'https://cdn.example.com/budget.xlsx',
                                },
                            ],
                        },
                    ],
                    draftMessage: 'unsent draft',
                },
            ],
            ChatFeedback: [
                {
                    id: 13,
                    createdAt: '2026-04-03T00:00:00.000Z',
                    agentName: 'Helper',
                    agentHash: 'hash-helper',
                    rating: 'up',
                    textRating: 'Very useful',
                    chatThread: JSON.stringify([
                        {
                            id: 'feedback-message-1',
                            sender: 'USER',
                            content: 'Thanks',
                        },
                    ]),
                    userNote: 'Keep this style',
                    expectedAnswer: 'Helpful guidance',
                    promptbookEngineVersion: '1.0.0',
                    url: 'https://example.com/chat',
                    ip: '127.0.0.1',
                    userAgent: 'test-agent',
                    language: 'en',
                    platform: 'web',
                },
            ],
            UserMemory: [
                {
                    id: 3,
                    createdAt: '2026-04-01T00:00:00.000Z',
                    updatedAt: '2026-04-02T00:00:00.000Z',
                    userId: 7,
                    agentPermanentId: 'helper-1',
                    content: 'Prefers concise answers.',
                    isGlobal: false,
                    deletedAt: null,
                },
            ],
            UserData: [
                {
                    id: 4,
                    createdAt: '2026-04-01T00:00:00.000Z',
                    updatedAt: '2026-04-02T00:00:00.000Z',
                    userId: 7,
                    key: 'theme',
                    value: 'dark',
                },
            ],
            Wallet: [
                {
                    id: 5,
                    createdAt: '2026-04-01T00:00:00.000Z',
                    updatedAt: '2026-04-02T00:00:00.000Z',
                    userId: 7,
                    isUserScoped: true,
                    agentPermanentId: 'helper-1',
                    recordType: 'ACCESS_TOKEN',
                    service: 'github',
                    key: 'default',
                    jsonSchema: null,
                    username: 'alice',
                    password: null,
                    secret: 'super-secret',
                    cookies: null,
                    isGlobal: false,
                    deletedAt: null,
                },
            ],
            File: [
                {
                    id: 21,
                    createdAt: '2026-04-02T00:00:00.000Z',
                    userId: 7,
                    fileName: 'user/files/budget.xlsx',
                    fileSize: 1234,
                    fileType: 'application/vnd.ms-excel',
                    storageUrl: 'https://cdn.example.com/budget.xlsx',
                    shortUrl: null,
                    purpose: 'CHAT_ATTACHMENT',
                    status: 'COMPLETED',
                    agentId: 10,
                    securityResult: { antivirus: 'clean' },
                },
            ],
            Image: [
                {
                    id: 22,
                    createdAt: '2026-04-02T00:10:00.000Z',
                    updatedAt: '2026-04-02T00:10:00.000Z',
                    filename: 'avatar.png',
                    prompt: 'Blue octopus',
                    cdnUrl: 'https://cdn.example.com/avatar.png',
                    cdnKey: 'avatars/avatar.png',
                    agentId: 10,
                    purpose: 'AVATAR',
                },
            ],
            Message: [
                {
                    id: 31,
                    createdAt: '2026-04-04T00:00:00.000Z',
                    channel: 'EMAIL',
                    direction: 'OUTBOUND',
                    sender: { email: 'noreply@example.com' },
                    recipients: [{ email: 'alice@example.com' }],
                    content: 'Hello Alice',
                    threadId: 'thread-1',
                    metadata: { subject: 'Welcome' },
                },
            ],
            MessageSendAttempt: [
                {
                    id: 32,
                    createdAt: '2026-04-04T00:00:05.000Z',
                    messageId: 31,
                    providerName: 'sendgrid',
                    isSuccessful: true,
                    raw: { providerMessageId: 'abc' },
                },
            ],
        });
        jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
            if (String(url) === 'https://cdn.example.com/budget.xlsx') {
                return new Response('budget-bytes', { status: 200 });
            }

            if (String(url) === 'https://cdn.example.com/avatar.png') {
                return new Response('avatar-bytes', { status: 200 });
            }

            throw new Error(`Unexpected fetch ${String(url)}`);
        });

        const { filename, stream } = await createServerBackupZipStream([
            'conversations',
            'users',
            'files',
            'messages',
        ]);
        const zip = await JSZip.loadAsync(await readStreamToBuffer(stream));
        const archiveRoot = filename.replace(/\.zip$/, '');

        const chatFileName = zip
            .file(new RegExp(`^${archiveRoot}/data/conversations/chats/.+\\.json$`))
            .map((file) => file.name)
            .find((fileName) => !fileName.endsWith('.metadata.json'))!;
        const chatMetadataFileName = chatFileName.replace(/\.json$/, '.metadata.json');
        const chatMessages = JSON.parse(await zip.file(chatFileName)!.async('string')) as Array<{ content: string }>;
        const chatMetadata = JSON.parse(await zip.file(chatMetadataFileName)!.async('string')) as {
            draftMessage: string;
            user: { username: string };
            agent: { permanentId: string };
        };
        expect(chatMessages).toEqual([
            {
                id: 'message-1',
                sender: 'USER',
                content: 'See attachment',
                attachments: [
                    {
                        name: 'budget.xlsx',
                        type: 'application/vnd.ms-excel',
                        url: 'https://cdn.example.com/budget.xlsx',
                    },
                ],
            },
        ]);
        expect(chatMetadata).toMatchObject({
            draftMessage: 'unsent draft',
            user: { username: 'alice' },
            agent: { permanentId: 'helper-1' },
        });

        const feedbackFileName = zip
            .file(new RegExp(`^${archiveRoot}/data/conversations/feedback/.+\\.json$`))
            .map((file) => file.name)
            .find((fileName) => !fileName.endsWith('.metadata.json'))!;
        const feedbackMetadataFileName = feedbackFileName.replace(/\.json$/, '.metadata.json');
        const feedbackMessages = JSON.parse(await zip.file(feedbackFileName)!.async('string')) as Array<{ content: string }>;
        const feedbackMetadata = JSON.parse(await zip.file(feedbackMetadataFileName)!.async('string')) as {
            rating: string;
            textRating: string;
            userNote: string;
        };
        expect(feedbackMessages).toEqual([{ id: 'feedback-message-1', sender: 'USER', content: 'Thanks' }]);
        expect(feedbackMetadata).toMatchObject({
            rating: 'up',
            textRating: 'Very useful',
            userNote: 'Keep this style',
        });

        const userFileName = zip.file(new RegExp(`^${archiveRoot}/data/users/.+\\.json$`))![0]!.name;
        const userPayload = JSON.parse(await zip.file(userFileName)!.async('string')) as {
            user: { username: string };
            wallet: Array<{ secret?: string; hasSecret: boolean }>;
        };
        expect(userPayload.user.username).toBe('alice');
        expect(userPayload.wallet).toEqual([
            expect.objectContaining({
                hasSecret: true,
            }),
        ]);
        expect(userPayload.wallet[0]!.secret).toBeUndefined();

        expect(await zip.file(`${archiveRoot}/data/files/uploads/budget.xlsx`)!.async('string')).toBe('budget-bytes');
        const uploadMetadata = JSON.parse(
            await zip.file(`${archiveRoot}/data/files/uploads/budget.xlsx.metadata.json`)!.async('string'),
        ) as {
            attachedToMessages: Array<{ chatId: string; messageId: string }>;
            uploadedBy: { username: string };
            contentIncluded: boolean;
        };
        expect(uploadMetadata.uploadedBy.username).toBe('alice');
        expect(uploadMetadata.contentIncluded).toBe(true);
        expect(uploadMetadata.attachedToMessages).toEqual([
            expect.objectContaining({
                chatId: 'chat-1',
                messageId: 'message-1',
            }),
        ]);

        expect(await zip.file(`${archiveRoot}/data/files/images/avatar.png`)!.async('string')).toBe('avatar-bytes');
        const imageMetadata = JSON.parse(
            await zip.file(`${archiveRoot}/data/files/images/avatar.png.metadata.json`)!.async('string'),
        ) as { agent: { permanentId: string } };
        expect(imageMetadata.agent.permanentId).toBe('helper-1');

        const messageFileName = zip.file(new RegExp(`^${archiveRoot}/data/messages/.+\\.json$`))![0]!.name;
        const messagePayload = JSON.parse(await zip.file(messageFileName)!.async('string')) as {
            sendAttempts: Array<{ providerName: string; isSuccessful: boolean; raw?: unknown }>;
        };
        expect(messagePayload.sendAttempts).toEqual([
            {
                id: 32,
                createdAt: '2026-04-04T00:00:05.000Z',
                providerName: 'sendgrid',
                isSuccessful: true,
            },
        ]);
        expect(messagePayload.sendAttempts[0]!.raw).toBeUndefined();
    });
});
