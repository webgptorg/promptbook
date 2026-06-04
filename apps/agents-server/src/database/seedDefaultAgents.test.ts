import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { seedDefaultAgents } from './seedDefaultAgents';
import { $provideLocalSqliteSupabase, $resetLocalSqliteSupabaseForTests } from './sqlite/$provideLocalSqliteSupabase';

/**
 * Original process environment restored after each SQLite seed test.
 */
const ORIGINAL_ENVIRONMENT = { ...process.env };

/**
 * Logger used to keep seed tests quiet.
 */
const SILENT_LOGGER = {
    error: () => undefined,
    info: () => undefined,
    warn: () => undefined,
};

describe('seedDefaultAgents', () => {
    let temporaryDirectory: string;
    let defaultAgentsDirectory: string;

    beforeEach(() => {
        temporaryDirectory = mkdtempSync(join(tmpdir(), 'promptbook-default-agents-'));
        defaultAgentsDirectory = join(temporaryDirectory, 'default-agents');
        mkdirSync(defaultAgentsDirectory, { recursive: true });

        process.env = {
            ...ORIGINAL_ENVIRONMENT,
            PTBK_AGENTS_SERVER_DATABASE: 'sqlite',
            PTBK_AGENTS_SERVER_SQLITE_PATH: join(temporaryDirectory, 'agents-server.sqlite'),
            SUPABASE_TABLE_PREFIX: '',
        };
    });

    afterEach(() => {
        $resetLocalSqliteSupabaseForTests();
        process.env = { ...ORIGINAL_ENVIRONMENT };
        rmSync(temporaryDirectory, { recursive: true, force: true });
    });

    it('creates sorted bundled default agents when the server has no agents', async () => {
        writeDefaultAgentBook('zeta.book', 'Zeta Agent\n\nPERSONA You answer zeta questions.\nCLOSED\n');
        writeDefaultAgentBook('alpha.book', 'Alpha Agent\n\nPERSONA You answer alpha questions.\nCLOSED\n');
        writeFileSync(join(defaultAgentsDirectory, 'ignore.txt'), 'not a book\n', 'utf-8');

        const result = await seedDefaultAgents({
            defaultAgentDirectory: defaultAgentsDirectory,
            logger: SILENT_LOGGER,
        });
        const supabase = $provideLocalSqliteSupabase();
        const agentsResult = await supabase
            .from('Agent')
            .select('agentName,sortOrder,visibility')
            .order('sortOrder', { ascending: true });
        const historyResult = await supabase
            .from('AgentHistory')
            .select('agentName')
            .order('createdAt', { ascending: true });

        expect(result).toMatchObject({
            existingAgentCount: 0,
            sourceCount: 2,
            createdCount: 2,
            createdAgentNames: ['alpha-agent', 'zeta-agent'],
            skippedReason: null,
        });
        expect(agentsResult.error).toBeNull();
        expect((agentsResult.data as Array<{ agentName: string }>).map((agent) => agent.agentName)).toEqual([
            'alpha-agent',
            'zeta-agent',
        ]);
        expect((agentsResult.data as Array<{ sortOrder: number }>).map((agent) => agent.sortOrder)).toEqual([0, 1]);
        expect((agentsResult.data as Array<{ visibility: string }>).map((agent) => agent.visibility)).toEqual([
            'UNLISTED',
            'UNLISTED',
        ]);
        expect((historyResult.data as Array<{ agentName: string }>).map((agent) => agent.agentName)).toEqual([
            'alpha-agent',
            'zeta-agent',
        ]);
    });

    it('skips bundled defaults when an agent already exists', async () => {
        writeDefaultAgentBook('alpha.book', 'Alpha Agent\n\nPERSONA You answer alpha questions.\nCLOSED\n');

        const supabase = $provideLocalSqliteSupabase();
        await supabase.from('Agent').insert({
            agentName: 'existing-agent',
            permanentId: 'existing-agent-id',
            agentHash: 'existing-agent-hash',
            agentSource: 'Existing Agent\n\nCLOSED\n',
            agentProfile: { agentName: 'existing-agent' },
            promptbookEngineVersion: 'test',
        });

        const result = await seedDefaultAgents({
            defaultAgentDirectory: defaultAgentsDirectory,
            logger: SILENT_LOGGER,
        });
        const agentsResult = await supabase.from('Agent').select('agentName');

        expect(result).toMatchObject({
            existingAgentCount: 1,
            sourceCount: 0,
            createdCount: 0,
            createdAgentNames: [],
            skippedReason: 'existing-agents',
        });
        expect((agentsResult.data as Array<{ agentName: string }>).map((agent) => agent.agentName)).toEqual([
            'existing-agent',
        ]);
    });

    /**
     * Writes one default agent source into the temporary default-agent directory.
     */
    function writeDefaultAgentBook(filename: string, source: string): void {
        writeFileSync(join(defaultAgentsDirectory, filename), source, 'utf-8');
    }
});
