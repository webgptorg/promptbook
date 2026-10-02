import { Command } from 'commander';
import { startWorkspaceServer } from '../../../../scripts/run-codex-prompts/workspace/startWorkspaceServer';
import { $preflightWorkspaceRepository } from '../common/workspaceRepository';
import { $initializeServerCommand } from '../server';
import { $initializeCoderServerCommand } from './server';

jest.mock('../../../../scripts/run-codex-prompts/workspace/startWorkspaceServer', () => ({
    startWorkspaceServer: jest.fn(),
}));
jest.mock('../common/workspaceRepository', () => ({ $preflightWorkspaceRepository: jest.fn() }));

/** Builds the two public spellings using the same command registration. */
function createProgram(): Command {
    const program = new Command().exitOverride();
    $initializeServerCommand(program);
    $initializeCoderServerCommand(program.command('coder'));
    return program;
}

describe('workspace server command contract', () => {
    const environmentNames = [
        'PTBK_SERVER_PORT',
        'PTBK_CODER_SERVER_PORT',
        'PORT',
        'PTBK_HARNESS',
        'PTBK_MODEL',
        'PTBK_THINKING_LEVEL',
    ] as const;
    let savedEnvironment: NodeJS.ProcessEnv;
    beforeEach(() => {
        savedEnvironment = { ...process.env };
        for (const name of environmentNames) delete process.env[name];
        jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        jest.mocked($preflightWorkspaceRepository).mockResolvedValue({
            projectPath: '/repo/project',
            repositoryRoot: '/repo',
            repositoryStatus: 'reused',
        });
    });
    afterEach(() => {
        for (const name of environmentNames) {
            if (savedEnvironment[name] === undefined) delete process.env[name];
            else process.env[name] = savedEnvironment[name];
        }
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });
    it('registers the same helper and identical options for both spellings', () => {
        expect($initializeCoderServerCommand).toBe($initializeServerCommand);
        const program = createProgram();
        const canonical = program.commands.find((command) => command.name() === 'server')!;
        const alias = program.commands.find((command) => command.name() === 'coder')!.commands[0]!;
        expect(alias.options.map((option) => [option.flags, option.defaultValue, option.envVar])).toEqual(
            canonical.options.map((option) => [option.flags, option.defaultValue, option.envVar]),
        );
    });
    it.each(
        [
            [],
            ['--workspace', 'sub-project', '--port', '5001', '--no-ui', '--no-questions'],
            ['--dry-run', '--no-auto'],
            [
                '--harness',
                'qwen-code',
                '--model',
                'default',
                '--agent',
                'agents/special.book',
                '--min-priority',
                '1',
                '--max-priority',
                '4',
            ],
            ['--no-commit', '--no-auto-pull', '--no-auto-push'],
        ].map((flags) => [flags]),
    )('resolves identical actions for %j', async (flags) => {
        const program = createProgram();
        await program.parseAsync(['node', 'test', 'server', ...flags]);
        const canonical = jest.mocked(startWorkspaceServer).mock.calls[0]![0];
        await createProgram().parseAsync(['node', 'test', 'coder', 'server', ...flags]);
        expect(jest.mocked(startWorkspaceServer).mock.calls[1]![0]).toEqual(canonical);
        expect(canonical.workspace).toEqual({
            projectPath: '/repo/project',
            repositoryRoot: '/repo',
            repositoryStatus: 'reused',
        });
    });
    it('starts without selecting a permanent agent, harness or priority, and enables synchronization', async () => {
        await createProgram().parseAsync(['node', 'test', 'server']);
        expect(startWorkspaceServer).toHaveBeenCalledWith(
            expect.objectContaining({
                port: 4441,
                agentName: undefined,
                agentFilter: undefined,
                priorityFilter: {},
                autoPull: true,
                autoPush: true,
                noCommit: false,
            }),
        );
        expect(process.exit).not.toHaveBeenCalled();
    });
    it('uses shared read-only preflight during preview', async () => {
        await createProgram().parseAsync(['node', 'test', 'server', '--workspace', 'nested', '--dry-run']);
        expect($preflightWorkspaceRepository).toHaveBeenCalledWith(
            expect.objectContaining({ projectDirectory: 'nested', policy: 'read-only' }),
        );
    });
    it('resolves legacy port variables consistently and retains explicit option precedence', async () => {
        process.env.PORT = '5002';
        process.env.PTBK_CODER_SERVER_PORT = '5003';
        process.env.PTBK_SERVER_PORT = '5004';
        await createProgram().parseAsync(['node', 'test', 'coder', 'server']);
        expect(startWorkspaceServer).toHaveBeenLastCalledWith(expect.objectContaining({ port: 5004 }));
        await createProgram().parseAsync(['node', 'test', 'server', '--port', '5005']);
        expect(startWorkspaceServer).toHaveBeenLastCalledWith(expect.objectContaining({ port: 5005 }));
        delete process.env.PTBK_SERVER_PORT;
        await createProgram().parseAsync(['node', 'test', 'server']);
        expect(startWorkspaceServer).toHaveBeenLastCalledWith(expect.objectContaining({ port: 5003 }));
    });
    it.each(['0', '65536', '4441xyz', 'NaN'])('rejects invalid port %s before setup', async (port) => {
        await createProgram().parseAsync(['node', 'test', 'server', '--port', port]);
        expect(process.exit).toHaveBeenCalledWith(1);
        expect($preflightWorkspaceRepository).not.toHaveBeenCalled();
        expect(startWorkspaceServer).not.toHaveBeenCalled();
    });
});
