import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { reinstateDefaultAgents } from './reinstateDefaultAgents';
import { $provideLocalSqliteSupabase, $resetLocalSqliteSupabaseForTests } from './sqlite/$provideLocalSqliteSupabase';

/**
 * Original process environment restored after each SQLite reinstate test.
 */
const ORIGINAL_ENVIRONMENT = { ...process.env };

/**
 * Logger used to keep reinstate tests quiet.
 */
const SILENT_LOGGER = {
    info: () => undefined,
    warn: () => undefined,
};

describe('reinstateDefaultAgents', () => {
    let temporaryDirectory: string;
    let defaultAgentsDirectory: string;

    beforeEach(() => {
        temporaryDirectory = mkdtempSync(join(tmpdir(), 'promptbook-reinstate-default-agents-'));
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

    it('creates every default agent when the server has none', async () => {
        writeDefaultAgentBook('zeta.book', 'Zeta Agent\n\nPERSONA You answer zeta questions.\nCLOSED\n');
        writeDefaultAgentBook('alpha.book', 'Alpha Agent\n\nPERSONA You answer alpha questions.\nCLOSED\n');

        const result = await reinstateDefaultAgents({
            defaultAgentDirectory: defaultAgentsDirectory,
            logger: SILENT_LOGGER,
        });
        const supabase = $provideLocalSqliteSupabase();
        const agentsResult = await supabase
            .from('Agent')
            .select('agentName')
            .order('sortOrder', { ascending: true });

        expect(result.createdAgentNames).toEqual(['alpha-agent', 'zeta-agent']);
        expect((agentsResult.data as Array<{ agentName: string }>).map((agent) => agent.agentName)).toEqual([
            'alpha-agent',
            'zeta-agent',
        ]);
    });

    it('recreates only the missing default agents and leaves existing ones untouched', async () => {
        writeDefaultAgentBook('alpha.book', 'Alpha Agent\n\nPERSONA You answer alpha questions.\nCLOSED\n');
        writeDefaultAgentBook('zeta.book', 'Zeta Agent\n\nPERSONA You answer zeta questions.\nCLOSED\n');

        const supabase = $provideLocalSqliteSupabase();
        await supabase.from('Agent').insert({
            agentName: 'alpha-agent',
            permanentId: 'alpha-agent-id',
            agentHash: 'edited-alpha-hash',
            agentSource: 'Alpha Agent\n\nPERSONA Edited alpha.\nCLOSED\n',
            agentProfile: { agentName: 'alpha-agent' },
            promptbookEngineVersion: 'test',
        });

        const result = await reinstateDefaultAgents({
            defaultAgentDirectory: defaultAgentsDirectory,
            logger: SILENT_LOGGER,
        });
        const agentsResult = await supabase.from('Agent').select('agentName,agentHash');
        const agentRows = agentsResult.data as Array<{ agentName: string; agentHash: string }>;

        expect(result.createdAgentNames).toEqual(['zeta-agent']);
        expect(agentRows.map((agent) => agent.agentName).sort()).toEqual(['alpha-agent', 'zeta-agent']);
        // Note: The already-present (edited) alpha agent must be preserved exactly, never overwritten.
        expect(agentRows.find((agent) => agent.agentName === 'alpha-agent')?.agentHash).toBe('edited-alpha-hash');
    });

    it('returns nothing when there are no bundled default books', async () => {
        const result = await reinstateDefaultAgents({
            defaultAgentDirectory: defaultAgentsDirectory,
            logger: SILENT_LOGGER,
        });

        expect(result.createdAgentNames).toEqual([]);
    });

    /**
     * Writes one default agent source into the temporary default-agent directory.
     */
    function writeDefaultAgentBook(filename: string, source: string): void {
        writeFileSync(join(defaultAgentsDirectory, filename), source, 'utf-8');
    }
});
