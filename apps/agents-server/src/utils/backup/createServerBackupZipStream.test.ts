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
        jest.clearAllMocks();
    });

    it('writes the selected sections into one ZIP archive with a manifest and the existing books tree', async () => {
        mockBackupTables({
            Metadata: [
                { id: 2, key: 'SERVER_LANGUAGE', value: 'en', createdAt: '2026-04-01T00:00:00.000Z', updatedAt: '2026-04-01T00:00:00.000Z', note: null },
                { id: 1, key: 'SERVER_NAME', value: 'Promptbook', createdAt: '2026-04-01T00:00:00.000Z', updatedAt: '2026-04-01T00:00:00.000Z', note: null },
            ],
            ServerLimit: [{ id: 1, key: 'MAX_FILE_UPLOAD_SIZE_MB', value: 25, createdAt: '2026-04-01T00:00:00.000Z', updatedAt: '2026-04-01T00:00:00.000Z' }],
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
            AgentExternals: [{ id: 1, createdAt: '2026-04-01T00:00:00.000Z', updatedAt: '2026-04-01T00:00:00.000Z', type: 'remote', hash: 'abc', externalId: 'ext-1', vendor: 'demo', note: null }],
        });

        const { filename, stream } = await createServerBackupZipStream(['agents', 'metadata']);
        const archiveBuffer = await readStreamToBuffer(stream);
        const zip = await JSZip.loadAsync(archiveBuffer);
        const archiveRoot = filename.replace(/\.zip$/, '');

        expect(filename).toMatch(/^promptbook-server-backup-\d{4}-\d{2}-\d{2}\.zip$/);

        const manifestFile = zip.file(`${archiveRoot}/manifest.json`);
        expect(manifestFile).not.toBeNull();

        const manifest = JSON.parse(await manifestFile!.async('string')) as {
            selectedSections: string[];
            isFullBackup: boolean;
        };
        expect(manifest.selectedSections).toEqual(['metadata', 'agents']);
        expect(manifest.isFullBackup).toBe(false);

        const bookFile = zip.file(`${archiveRoot}/books/Support/Helper.book`);
        expect(bookFile).not.toBeNull();
        expect(await bookFile!.async('string')).toBe('PERSONA Helpful helper');

        const metadataPayload = JSON.parse(
            await zip.file(`${archiveRoot}/data/metadata/Metadata.json`)!.async('string'),
        ) as { rowCount: number; rows: Array<{ key: string }> };
        expect(metadataPayload.rowCount).toBe(2);
        expect(metadataPayload.rows.map(({ key }) => key)).toEqual(['SERVER_NAME', 'SERVER_LANGUAGE']);

        const agentPayload = JSON.parse(await zip.file(`${archiveRoot}/data/agents/Agent.json`)!.async('string')) as {
            databaseTable: string;
            rows: Array<{ permanentId: string; folderId: number }>;
        };
        expect(agentPayload.databaseTable).toBe('server_Agent');
        expect(agentPayload.rows.map(({ permanentId, folderId }) => ({ permanentId, folderId }))).toEqual([
            { permanentId: 'helper-1', folderId: 5 },
        ]);

        expect(zip.file(`${archiveRoot}/data/conversations/UserChat.json`)).toBeNull();
    });

    it('preserves conversation relationships when related conversation and user sections are exported together', async () => {
        mockBackupTables({
            User: [
                {
                    id: 7,
                    createdAt: '2026-04-01T00:00:00.000Z',
                    updatedAt: '2026-04-01T00:00:00.000Z',
                    username: 'alice',
                    passwordHash: 'hashed-password',
                    isAdmin: true,
                    profileImageUrl: null,
                },
            ],
            UserMemory: [],
            UserData: [],
            Wallet: [],
            UserChat: [
                {
                    id: 'chat-1',
                    createdAt: '2026-04-02T00:00:00.000Z',
                    updatedAt: '2026-04-02T00:00:00.000Z',
                    lastMessageAt: '2026-04-02T00:05:00.000Z',
                    title: 'Incident',
                    userId: 7,
                    agentPermanentId: 'helper-1',
                    source: 'WEB_UI',
                    messages: [],
                    draftMessage: null,
                },
            ],
            UserChatJob: [
                {
                    id: 'job-1',
                    createdAt: '2026-04-02T00:00:00.000Z',
                    updatedAt: '2026-04-02T00:00:00.000Z',
                    chatId: 'chat-1',
                    userId: 7,
                    agentPermanentId: 'helper-1',
                    userMessageId: 'msg-user',
                    assistantMessageId: 'msg-assistant',
                    clientMessageId: 'msg-client',
                    status: 'COMPLETED',
                    parameters: {},
                    queuedAt: '2026-04-02T00:00:00.000Z',
                    startedAt: '2026-04-02T00:00:01.000Z',
                    completedAt: '2026-04-02T00:00:05.000Z',
                    cancelRequestedAt: null,
                    lastHeartbeatAt: '2026-04-02T00:00:04.000Z',
                    leaseExpiresAt: '2026-04-02T00:01:00.000Z',
                    attemptCount: 1,
                    provider: 'demo',
                    failureReason: null,
                },
            ],
            ChatHistory: [
                {
                    id: 1,
                    createdAt: '2026-04-02T00:00:00.000Z',
                    messageHash: 'hash-1',
                    previousMessageHash: null,
                    agentName: 'Helper',
                    agentHash: 'hash-helper',
                    message: {},
                    promptbookEngineVersion: '1.0.0',
                    url: null,
                    ip: null,
                    userAgent: null,
                    language: 'en',
                    platform: 'web',
                    source: 'AGENT_PAGE_CHAT',
                    apiKey: null,
                    actorType: 'ANONYMOUS',
                    usage: null,
                    userId: 7,
                },
            ],
            ChatFeedback: [],
        });

        const { filename, stream } = await createServerBackupZipStream(['conversations', 'users']);
        const zip = await JSZip.loadAsync(await readStreamToBuffer(stream));
        const archiveRoot = filename.replace(/\.zip$/, '');

        const userPayload = JSON.parse(await zip.file(`${archiveRoot}/data/users/User.json`)!.async('string')) as {
            rows: Array<{ id: number; username: string }>;
        };
        expect(userPayload.rows.map(({ id, username }) => ({ id, username }))).toEqual([{ id: 7, username: 'alice' }]);

        const userChatPayload = JSON.parse(await zip.file(`${archiveRoot}/data/conversations/UserChat.json`)!.async('string')) as {
            rows: Array<{ id: string; userId: number; agentPermanentId: string }>;
        };
        expect(
            userChatPayload.rows.map(({ id, userId, agentPermanentId }) => ({ id, userId, agentPermanentId })),
        ).toEqual([{ id: 'chat-1', userId: 7, agentPermanentId: 'helper-1' }]);

        const userChatJobPayload = JSON.parse(
            await zip.file(`${archiveRoot}/data/conversations/UserChatJob.json`)!.async('string'),
        ) as { rows: Array<{ chatId: string; userId: number; agentPermanentId: string }> };
        expect(
            userChatJobPayload.rows.map(({ chatId, userId, agentPermanentId }) => ({ chatId, userId, agentPermanentId })),
        ).toEqual([{ chatId: 'chat-1', userId: 7, agentPermanentId: 'helper-1' }]);

        const chatHistoryPayload = JSON.parse(
            await zip.file(`${archiveRoot}/data/conversations/ChatHistory.json`)!.async('string'),
        ) as { rows: Array<{ userId: number; agentName: string }> };
        expect(chatHistoryPayload.rows.map(({ userId, agentName }) => ({ userId, agentName }))).toEqual([
            { userId: 7, agentName: 'Helper' },
        ]);
    });
});
