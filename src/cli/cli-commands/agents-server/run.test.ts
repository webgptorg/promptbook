import { Command } from 'commander';
import { ensureAgentsServerBuild } from './buildAgentsServer';
import { loadAgentsServerProjectEnvironment, startAgentsServer } from './startAgentsServer';
import {
    $initializeAgentsServerBuildCommand,
    $initializeAgentsServerDevCommand,
    $initializeAgentsServerStartCommand,
} from './run';

jest.mock('./buildAgentsServer', () => ({
    ensureAgentsServerBuild: jest.fn(),
}));
jest.mock('./startAgentsServer', () => ({
    loadAgentsServerProjectEnvironment: jest.fn(),
    startAgentsServer: jest.fn(),
}));

/**
 * Typed Jest mock for the Agents Server build helper.
 */
function getEnsureAgentsServerBuildMock(): jest.MockedFunction<typeof ensureAgentsServerBuild> {
    return ensureAgentsServerBuild as jest.MockedFunction<typeof ensureAgentsServerBuild>;
}

/**
 * Typed Jest mock for the Agents Server foreground runtime.
 */
function getStartAgentsServerMock(): jest.MockedFunction<typeof startAgentsServer> {
    return startAgentsServer as jest.MockedFunction<typeof startAgentsServer>;
}

/**
 * Typed Jest mock for loading launch-directory Agents Server environment.
 */
function getLoadAgentsServerProjectEnvironmentMock(): jest.MockedFunction<typeof loadAgentsServerProjectEnvironment> {
    return loadAgentsServerProjectEnvironment as jest.MockedFunction<typeof loadAgentsServerProjectEnvironment>;
}

/**
 * Creates a Commander program with the `agents-server start` subcommand registered.
 */
function createProgramWithAgentsServerStartCommand(): Command {
    const program = new Command();
    $initializeAgentsServerStartCommand(program);
    return program;
}

/**
 * Creates a Commander program with the `agents-server dev` subcommand registered.
 */
function createProgramWithAgentsServerDevCommand(): Command {
    const program = new Command();
    $initializeAgentsServerDevCommand(program);
    return program;
}

/**
 * Creates a Commander program with the `agents-server build` subcommand registered.
 */
function createProgramWithAgentsServerBuildCommand(): Command {
    const program = new Command();
    $initializeAgentsServerBuildCommand(program);
    return program;
}

describe('$initializeAgentsServerStartCommand', () => {
    let processExitSpy: jest.SpyInstance<never, [code?: string | number | null | undefined]>;
    let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;
    let consoleInfoSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;
    const originalEnvironment = {
        PORT: process.env.PORT,
        PTBK_AGENT: process.env.PTBK_AGENT,
        PTBK_MODEL: process.env.PTBK_MODEL,
        PTBK_THINKING_LEVEL: process.env.PTBK_THINKING_LEVEL,
    };

    beforeEach(() => {
        delete process.env.PORT;
        delete process.env.PTBK_AGENT;
        delete process.env.PTBK_MODEL;
        delete process.env.PTBK_THINKING_LEVEL;
        getEnsureAgentsServerBuildMock().mockResolvedValue({
            appPath: 'apps/agents-server',
            nodeModulesPath: 'node_modules',
            nextCliPath: 'next',
            isAppPathMaterialized: false,
        });
        getStartAgentsServerMock().mockResolvedValue(undefined);
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(() => {
        restoreEnvironmentVariable('PORT', originalEnvironment.PORT);
        restoreEnvironmentVariable('PTBK_AGENT', originalEnvironment.PTBK_AGENT);
        restoreEnvironmentVariable('PTBK_MODEL', originalEnvironment.PTBK_MODEL);
        restoreEnvironmentVariable('PTBK_THINKING_LEVEL', originalEnvironment.PTBK_THINKING_LEVEL);
        processExitSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        consoleInfoSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('starts on the default port with local runner options from CLI flags', async () => {
        const program = createProgramWithAgentsServerStartCommand();

        await program.parseAsync(
            ['node', 'test', 'start', '--agent', 'github-copilot', '--model', 'gpt-5.4', '--thinking-level', 'xhigh'],
            { from: 'node' },
        );

        expect(getStartAgentsServerMock()).toHaveBeenCalledWith({
            port: 4440,
            agentName: 'github-copilot',
            model: 'gpt-5.4',
            noUi: false,
            thinkingLevel: 'xhigh',
            allowCredits: false,
            nextRuntimeMode: 'start',
            isBuildForced: false,
        });
        expect(processExitSpy).not.toHaveBeenCalled();
    });

    it('uses PTBK and PORT environment defaults when flags are omitted', async () => {
        process.env.PORT = '4555';
        process.env.PTBK_AGENT = 'openai-codex';
        process.env.PTBK_MODEL = 'gpt-5.4';
        process.env.PTBK_THINKING_LEVEL = 'high';
        const program = createProgramWithAgentsServerStartCommand();

        await program.parseAsync(['node', 'test', 'start', '--no-ui'], { from: 'node' });

        expect(getStartAgentsServerMock()).toHaveBeenCalledWith({
            port: 4555,
            agentName: 'openai-codex',
            model: 'gpt-5.4',
            noUi: true,
            thinkingLevel: 'high',
            allowCredits: false,
            nextRuntimeMode: 'start',
            isBuildForced: false,
        });
    });

    it('lets CLI flags override PTBK and PORT environment defaults', async () => {
        process.env.PORT = '4555';
        process.env.PTBK_AGENT = 'openai-codex';
        process.env.PTBK_MODEL = 'gpt-5.2-codex';
        process.env.PTBK_THINKING_LEVEL = 'low';
        const program = createProgramWithAgentsServerStartCommand();

        await program.parseAsync(
            [
                'node',
                'test',
                'start',
                '--port',
                '4666',
                '--agent',
                'github-copilot',
                '--model',
                'gpt-5.4',
                '--thinking-level',
                'xhigh',
            ],
            { from: 'node' },
        );

        expect(getStartAgentsServerMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                port: 4666,
                agentName: 'github-copilot',
                model: 'gpt-5.4',
                thinkingLevel: 'xhigh',
                nextRuntimeMode: 'start',
            }),
        );
    });

    it('passes forced build startup through to the runtime', async () => {
        const program = createProgramWithAgentsServerStartCommand();

        await program.parseAsync(['node', 'test', 'start', '--agent', 'github-copilot', '--force-build'], {
            from: 'node',
        });

        expect(getStartAgentsServerMock()).toHaveBeenCalledWith(
            expect.objectContaining({
                isBuildForced: true,
            }),
        );
    });
});

describe('$initializeAgentsServerDevCommand', () => {
    let processExitSpy: jest.SpyInstance<never, [code?: string | number | null | undefined]>;
    let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;
    let consoleInfoSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        getStartAgentsServerMock().mockResolvedValue(undefined);
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(() => {
        processExitSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        consoleInfoSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('starts in development mode with hot reloading runtime options', async () => {
        const program = createProgramWithAgentsServerDevCommand();

        await program.parseAsync(
            ['node', 'test', 'dev', '--agent', 'github-copilot', '--model', 'gpt-5.4', '--thinking-level', 'xhigh'],
            { from: 'node' },
        );

        expect(getStartAgentsServerMock()).toHaveBeenCalledWith({
            port: 4440,
            agentName: 'github-copilot',
            model: 'gpt-5.4',
            noUi: false,
            thinkingLevel: 'xhigh',
            allowCredits: false,
            nextRuntimeMode: 'dev',
            isBuildForced: false,
        });
        expect(processExitSpy).not.toHaveBeenCalled();
    });
});

describe('$initializeAgentsServerBuildCommand', () => {
    let processExitSpy: jest.SpyInstance<never, [code?: string | number | null | undefined]>;
    let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;
    let consoleInfoSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        getEnsureAgentsServerBuildMock().mockResolvedValue({
            appPath: 'apps/agents-server',
            nodeModulesPath: 'node_modules',
            nextCliPath: 'next',
            isAppPathMaterialized: false,
        });
        processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(() => {
        processExitSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        consoleInfoSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('always forces a production build', async () => {
        const program = createProgramWithAgentsServerBuildCommand();

        await program.parseAsync(['node', 'test', 'build'], { from: 'node' });

        expect(getLoadAgentsServerProjectEnvironmentMock()).toHaveBeenCalledWith(process.cwd());
        expect(getEnsureAgentsServerBuildMock()).toHaveBeenCalledWith({ isBuildForced: true });
        expect(processExitSpy).toHaveBeenCalledWith(0);
    });
});

/**
 * Restores one environment variable after tests mutate Commander env defaults.
 */
function restoreEnvironmentVariable(name: string, value: string | undefined): void {
    if (value === undefined) {
        delete process.env[name];
        return;
    }

    process.env[name] = value;
}
