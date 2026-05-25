import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const ORIGINAL_ENVIRONMENT = { ...process.env };

describe('$provideLocalSqliteSupabase', () => {
    let temporaryDirectory: string;

    beforeEach(() => {
        jest.resetModules();
        temporaryDirectory = mkdtempSync(join(tmpdir(), 'promptbook-sqlite-'));
        process.env = {
            ...ORIGINAL_ENVIRONMENT,
            PTBK_AGENTS_SERVER_SQLITE_PATH: join(temporaryDirectory, 'agents-server.sqlite'),
        };
    });

    afterEach(async () => {
        const { $resetLocalSqliteSupabaseForTests } = await import('./$provideLocalSqliteSupabase');

        $resetLocalSqliteSupabaseForTests();
        process.env = { ...ORIGINAL_ENVIRONMENT };
        rmSync(temporaryDirectory, { recursive: true, force: true });
    });

    it('persists JSON rows and supports Supabase-style mutation queries', async () => {
        const { $provideLocalSqliteSupabase } = await import('./$provideLocalSqliteSupabase');
        const supabase = $provideLocalSqliteSupabase();
        const now = new Date('2026-05-24T10:00:00.000Z').toISOString();

        const { data: insertedJob, error: insertError } = await supabase
            .from('standalone_UserChatJob')
            .insert({
                id: 'job-1',
                createdAt: now,
                updatedAt: now,
                chatId: 'chat-1',
                userId: 1,
                agentPermanentId: 'agent-1',
                userMessageId: 'message-user-1',
                assistantMessageId: 'message-assistant-1',
                clientMessageId: 'client-message-1',
                status: 'QUEUED',
                parameters: { source: 'test' },
                queuedAt: now,
                attemptCount: 0,
            })
            .select('*')
            .maybeSingle();

        expect(insertError).toBeNull();
        expect(insertedJob).toMatchObject({
            id: 'job-1',
            parameters: { source: 'test' },
        });

        const { data: updatedJob, error: updateError } = await supabase
            .from('standalone_UserChatJob')
            .update({
                status: 'RUNNING',
                attemptCount: 1,
                lastHeartbeatAt: now,
            })
            .eq('id', 'job-1')
            .eq('status', 'QUEUED')
            .select('*')
            .maybeSingle();

        expect(updateError).toBeNull();
        expect(updatedJob).toMatchObject({
            id: 'job-1',
            status: 'RUNNING',
            attemptCount: 1,
        });

        const { data: jobs, error: selectError, count } = await supabase
            .from('standalone_UserChatJob')
            .select('*', { count: 'exact' })
            .eq('chatId', 'chat-1')
            .order('queuedAt', { ascending: true })
            .limit(10);

        expect(selectError).toBeNull();
        expect(count).toBe(1);
        expect(jobs).toHaveLength(1);
    });

    it('returns PostgreSQL-compatible duplicate errors for known unique indexes', async () => {
        const { $provideLocalSqliteSupabase } = await import('./$provideLocalSqliteSupabase');
        const supabase = $provideLocalSqliteSupabase();
        const now = new Date('2026-05-24T10:00:00.000Z').toISOString();
        const firstJob = {
            id: 'job-1',
            createdAt: now,
            updatedAt: now,
            chatId: 'chat-1',
            userId: 1,
            agentPermanentId: 'agent-1',
            userMessageId: 'message-user-1',
            assistantMessageId: 'message-assistant-1',
            clientMessageId: 'client-message-1',
            status: 'QUEUED',
            parameters: {},
            queuedAt: now,
            attemptCount: 0,
        };

        await supabase.from('standalone_UserChatJob').insert(firstJob);

        const { error } = await supabase.from('standalone_UserChatJob').insert({
            ...firstJob,
            id: 'job-2',
        });

        expect(error?.code).toBe('23505');
    });

    it('updates rows with auto-increment primary keys', async () => {
        const { $provideLocalSqliteSupabase } = await import('./$provideLocalSqliteSupabase');
        const supabase = $provideLocalSqliteSupabase();
        const now = new Date('2026-05-24T10:00:00.000Z').toISOString();

        const { data: insertedAgent, error: insertError } = await supabase
            .from('Agent')
            .insert({
                agentName: 'owner-assignment-regression',
                agentHash: 'agent-hash',
                permanentId: 'agent-permanent-id',
                agentProfile: { agentName: 'owner-assignment-regression' },
                agentSource: 'Owner Assignment Regression\nPERSONA You test SQLite updates.',
                promptbookEngineVersion: 'test',
                usage: {},
                createdAt: now,
            })
            .select('id,permanentId,userId')
            .maybeSingle();

        expect(insertError).toBeNull();
        expect(insertedAgent).toMatchObject({
            permanentId: 'agent-permanent-id',
            userId: null,
        });

        const { data: updatedAgent, error: updateError } = await supabase
            .from('Agent')
            .update({ userId: 7 })
            .eq('permanentId', 'agent-permanent-id')
            .select('id,permanentId,userId')
            .maybeSingle();

        expect(updateError).toBeNull();
        expect(updatedAgent).toMatchObject({
            id: (insertedAgent as { id: number }).id,
            permanentId: 'agent-permanent-id',
            userId: 7,
        });
    });
});
