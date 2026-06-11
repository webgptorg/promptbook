import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const ORIGINAL_ENVIRONMENT = { ...process.env };
const SQLITE_TABLE_PREFIX = 'standalone_';

describe('listUserChatSummarySeeds', () => {
    let temporaryDirectory: string;

    beforeEach(() => {
        jest.resetModules();
        temporaryDirectory = mkdtempSync(join(tmpdir(), 'promptbook-user-chat-'));
        process.env = {
            ...ORIGINAL_ENVIRONMENT,
            PTBK_AGENTS_SERVER_DATABASE: 'sqlite',
            PTBK_AGENTS_SERVER_SQLITE_PATH: join(temporaryDirectory, 'agents-server.sqlite'),
            SUPABASE_TABLE_PREFIX: SQLITE_TABLE_PREFIX,
        };

        jest.doMock('@/src/database/$getTableName', () => ({
            $getTableName: async (tableName: string) => `${SQLITE_TABLE_PREFIX}${tableName}`,
        }));
    });

    afterEach(async () => {
        const { $resetLocalSqliteSupabaseForTests } = await import('../../database/sqlite/$provideLocalSqliteSupabase');

        $resetLocalSqliteSupabaseForTests();
        jest.dontMock('@/src/database/$getTableName');
        process.env = { ...ORIGINAL_ENVIRONMENT };
        rmSync(temporaryDirectory, { recursive: true, force: true });
    });

    it('uses SQLite summary projection for sidebar chat metadata', async () => {
        const { $provideLocalSqliteSupabase } = await import('../../database/sqlite/$provideLocalSqliteSupabase');
        const { listUserChatSummarySeeds } = await import('./listUserChats');
        const supabase = $provideLocalSqliteSupabase();

        await supabase.from(`${SQLITE_TABLE_PREFIX}UserChat`).insert([
            {
                id: 'chat-old',
                createdAt: '2026-05-01T10:00:00.000Z',
                updatedAt: '2026-05-01T10:02:00.000Z',
                lastMessageAt: '2026-05-01T10:02:00.000Z',
                title: null,
                userId: 1,
                agentPermanentId: 'agent-1',
                source: 'WEB_UI',
                messages: [
                    { id: 'message-1', sender: 'USER', content: 'First question' },
                    { id: 'message-2', sender: 'AGENT', content: 'Thinking...', lifecycleState: 'running' },
                ],
            },
            {
                id: 'chat-new',
                createdAt: '2026-05-01T11:00:00.000Z',
                updatedAt: '2026-05-01T11:03:00.000Z',
                lastMessageAt: '2026-05-01T11:03:00.000Z',
                title: 'Stored title',
                userId: 1,
                agentPermanentId: 'agent-1',
                source: 'WEB_UI',
                messages: [
                    { id: 'message-3', sender: 'USER', content: 'Newest question' },
                    { id: 'message-4', sender: 'AGENT', content: 'Complete answer', isComplete: true },
                ],
            },
            {
                id: 'chat-other-web-user',
                createdAt: '2026-05-01T12:00:00.000Z',
                updatedAt: '2026-05-01T12:01:00.000Z',
                lastMessageAt: '2026-05-01T12:01:00.000Z',
                title: null,
                userId: 2,
                agentPermanentId: 'agent-1',
                source: 'WEB_UI',
                messages: [{ id: 'message-5', sender: 'USER', content: 'Other user web chat' }],
            },
            {
                id: 'chat-external',
                createdAt: '2026-05-01T13:00:00.000Z',
                updatedAt: '2026-05-01T13:01:00.000Z',
                lastMessageAt: '2026-05-01T13:01:00.000Z',
                title: null,
                userId: 2,
                agentPermanentId: 'agent-1',
                source: 'TEAM_MEMBER',
                messages: [{ id: 'message-6', sender: 'MODEL', content: 'External answer', isComplete: false }],
            },
        ]);

        const userSeeds = await listUserChatSummarySeeds({
            userId: 1,
            viewerIsAdmin: false,
            agentPermanentId: 'agent-1',
        });

        expect(userSeeds.map((chat) => chat.id)).toEqual(['chat-new', 'chat-old']);
        expect(userSeeds[0]).toMatchObject({
            firstUserMessageContent: 'Newest question',
            lastPreviewMessageContent: 'Complete answer',
            messagesCount: 2,
            pendingAssistantMessageCount: 0,
        });
        expect(userSeeds[1]).toMatchObject({
            firstUserMessageContent: 'First question',
            lastPreviewMessageContent: 'Thinking...',
            messagesCount: 2,
            pendingAssistantMessageCount: 1,
        });

        const adminSeeds = await listUserChatSummarySeeds({
            userId: 1,
            viewerIsAdmin: true,
            agentPermanentId: 'agent-1',
            includeExternalChats: true,
        });

        expect(adminSeeds.map((chat) => chat.id)).toEqual(['chat-external', 'chat-new', 'chat-old']);
        expect(adminSeeds.find((chat) => chat.id === 'chat-external')).toMatchObject({
            source: 'TEAM_MEMBER',
            pendingAssistantMessageCount: 1,
        });
    });
});
