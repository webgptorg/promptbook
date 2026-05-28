const mockQuery = jest.fn();
const mockEnd = jest.fn();
const mockPoolConstructor = jest.fn();
const ORIGINAL_ENVIRONMENT = { ...process.env };

jest.mock('pg', () => {
    class MockPool {
        public constructor(options: unknown) {
            mockPoolConstructor(options);
        }

        public query = mockQuery;
        public end = mockEnd;
    }

    return {
        Pool: MockPool,
    };
});

describe('$provideLocalPostgresSupabase', () => {
    beforeEach(() => {
        jest.resetModules();
        mockQuery.mockReset();
        mockEnd.mockReset();
        mockPoolConstructor.mockReset();
        process.env = {
            ...ORIGINAL_ENVIRONMENT,
            POSTGRES_URL: 'postgresql://promptbook:test-password@127.0.0.1:5432/promptbook?sslmode=disable',
            PTBK_AGENTS_SERVER_DATABASE: 'postgres',
        };
    });

    afterEach(async () => {
        const { $resetLocalPostgresSupabaseForTests } = await import('./$provideLocalPostgresSupabase');

        await $resetLocalPostgresSupabaseForTests();
        process.env = { ...ORIGINAL_ENVIRONMENT };
    });

    it('persists Supabase-style insert and select queries through PostgreSQL', async () => {
        const { $provideLocalPostgresSupabase } = await import('./$provideLocalPostgresSupabase');
        const supabase = $provideLocalPostgresSupabase();

        mockQuery.mockResolvedValueOnce({
            rows: [{ id: 'job-1', chatId: 'chat-1', status: 'QUEUED', parameters: { source: 'test' } }],
        });

        const { data, error } = await supabase
            .from('standalone_UserChatJob')
            .insert({
                id: 'job-1',
                chatId: 'chat-1',
                status: 'QUEUED',
                parameters: { source: 'test' },
            })
            .select('*')
            .maybeSingle();

        expect(error).toBeNull();
        expect(data).toMatchObject({
            id: 'job-1',
            chatId: 'chat-1',
            status: 'QUEUED',
        });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO "standalone_UserChatJob"'),
            expect.arrayContaining(['job-1', 'chat-1', 'QUEUED']),
        );
        expect(mockQuery.mock.calls[0]?.[0]).toContain('RETURNING *');
    });

    it('supports count, filters, ordering, and limit on select queries', async () => {
        const { $provideLocalPostgresSupabase } = await import('./$provideLocalPostgresSupabase');
        const supabase = $provideLocalPostgresSupabase();

        mockQuery
            .mockResolvedValueOnce({
                rows: [{ count: 1 }],
            })
            .mockResolvedValueOnce({
                rows: [{ id: 'job-1', chatId: 'chat-1', queuedAt: '2026-05-24T10:00:00.000Z' }],
            });

        const { data, error, count } = await supabase
            .from('standalone_UserChatJob')
            .select('*', { count: 'exact' })
            .eq('chatId', 'chat-1')
            .order('queuedAt', { ascending: true })
            .limit(10);

        expect(error).toBeNull();
        expect(count).toBe(1);
        expect(data).toHaveLength(1);
        expect(mockQuery.mock.calls[0]?.[0]).toContain('COUNT(*)::INT AS "count"');
        expect(mockQuery.mock.calls[1]?.[0]).toContain('ORDER BY "queuedAt" ASC');
        expect(mockQuery.mock.calls[1]?.[0]).toContain('LIMIT $2');
    });

    it('uses PostgreSQL upsert syntax with explicit conflict targets', async () => {
        const { $provideLocalPostgresSupabase } = await import('./$provideLocalPostgresSupabase');
        const supabase = $provideLocalPostgresSupabase();

        mockQuery.mockResolvedValueOnce({
            rows: [{ key: 'DEFAULT_THEME', value: 'SYSTEM' }],
        });

        const { data, error } = await supabase
            .from('Metadata')
            .upsert(
                {
                    key: 'DEFAULT_THEME',
                    value: 'SYSTEM',
                },
                { onConflict: 'key' },
            )
            .select('*')
            .maybeSingle();

        expect(error).toBeNull();
        expect(data).toMatchObject({
            key: 'DEFAULT_THEME',
            value: 'SYSTEM',
        });
        expect(mockQuery.mock.calls[0]?.[0]).toContain('ON CONFLICT ("key") DO UPDATE SET');
        expect(mockQuery.mock.calls[0]?.[0]).toContain('RETURNING *');
    });
});
