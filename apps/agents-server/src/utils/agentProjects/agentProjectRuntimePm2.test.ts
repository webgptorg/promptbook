import { execFile } from 'child_process';
import {
    PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED_ENV,
    startAgentProjectRuntimePm2Process,
    stopAgentProjectRuntimePm2Process,
} from './agentProjectRuntimePm2';

jest.mock('child_process', () => ({
    execFile: jest.fn(),
}));

/**
 * One pm2 invocation recorded by the mocked `execFile`.
 */
type RecordedPm2Command = {
    readonly executable: string;
    readonly arguments: ReadonlyArray<string>;
};

/**
 * Outcome the mocked pm2 answers with for one sub-command.
 */
type MockedPm2Outcome = {
    readonly stdout?: string;
    readonly error?: Error;
};

/**
 * Mocked `execFile` shared by every pm2 command of this module.
 */
const execFileMock = execFile as unknown as jest.Mock;

/**
 * Environment snapshot restored after each test.
 */
const ORIGINAL_PM2_ENABLED_FLAG = process.env[PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED_ENV];

/**
 * pm2 process name of the project used across these tests.
 */
const TESTED_PM2_PROCESS_NAME = 'promptbook-project-67b033fd7323-vetny-rozbor';

/**
 * Error `execFile` rejects with when a command wrote more than `maxBuffer` bytes to stdout.
 *
 * Note: This is what a real `pm2 jlist` did on a server hosting more than a dozen projects, because pm2 embeds a
 *       full environment snapshot into every listed process.
 */
const MAX_BUFFER_EXCEEDED_ERROR = Object.assign(new Error('stdout maxBuffer length exceeded'), {
    code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
    stderr: '',
});

/**
 * Error pm2 rejects with when no process of the requested name is registered.
 */
const MISSING_PM2_PROCESS_ERROR = Object.assign(new Error('Command failed: pm2 delete'), {
    stderr: `[PM2][ERROR] Process or Namespace ${TESTED_PM2_PROCESS_NAME} not found\n`,
});

/**
 * Records every pm2 command and answers each sub-command with the configured outcome.
 *
 * @param outcomeBySubCommand - Outcome used for one pm2 sub-command, defaulting to an empty success.
 * @returns Commands recorded so far.
 */
function mockPm2Commands(outcomeBySubCommand: Readonly<Record<string, MockedPm2Outcome>>): Array<RecordedPm2Command> {
    const recordedCommands: Array<RecordedPm2Command> = [];

    execFileMock.mockImplementation(
        (
            executable: string,
            commandArguments: ReadonlyArray<string>,
            _options: unknown,
            callback: (error: Error | null, output: { stdout: string; stderr: string }) => void,
        ) => {
            recordedCommands.push({ executable, arguments: commandArguments });

            const outcome = outcomeBySubCommand[commandArguments[0]!] ?? {};

            if (outcome.error) {
                callback(outcome.error, { stdout: '', stderr: '' });
                return;
            }

            callback(null, { stdout: outcome.stdout ?? '[]', stderr: '' });
        },
    );

    return recordedCommands;
}

describe('agentProjectRuntimePm2', () => {
    beforeEach(() => {
        process.env[PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED_ENV] = 'true';
        execFileMock.mockReset();
    });

    afterEach(() => {
        if (ORIGINAL_PM2_ENABLED_FLAG === undefined) {
            delete process.env[PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED_ENV];
        } else {
            process.env[PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED_ENV] = ORIGINAL_PM2_ENABLED_FLAG;
        }
    });

    it('deletes the pm2 process even when the process list cannot be read', async () => {
        const recordedCommands = mockPm2Commands({ jlist: { error: MAX_BUFFER_EXCEEDED_ERROR } });

        await stopAgentProjectRuntimePm2Process(TESTED_PM2_PROCESS_NAME);

        expect(recordedCommands.map((recordedCommand) => recordedCommand.arguments[0])).toContain('delete');
    });

    it('treats a process unknown to pm2 as already deleted', async () => {
        mockPm2Commands({ delete: { error: MISSING_PM2_PROCESS_ERROR } });

        await expect(stopAgentProjectRuntimePm2Process(TESTED_PM2_PROCESS_NAME)).resolves.toBeUndefined();
    });

    it('reports a delete which failed for any other reason', async () => {
        mockPm2Commands({ delete: { error: Object.assign(new Error('pm2 daemon is unreachable'), { stderr: '' }) } });

        await expect(stopAgentProjectRuntimePm2Process(TESTED_PM2_PROCESS_NAME)).rejects.toThrow(
            /Failed to delete the pm2 process/,
        );
    });

    it('does not start a second pm2 process of one project when the previous one could not be deleted', async () => {
        const recordedCommands = mockPm2Commands({
            jlist: { error: MAX_BUFFER_EXCEEDED_ERROR },
            delete: { error: Object.assign(new Error('pm2 daemon is unreachable'), { stderr: '' }) },
        });

        await expect(
            startAgentProjectRuntimePm2Process({
                agentPermanentId: 'qv7vjbrnucethk',
                projectName: 'vetny-rozbor',
                projectPath: '/opt/promptbook-agents-server/projects/vetny-rozbor',
                mode: 'dev-server',
                port: 41145,
                command: 'npm run dev',
                publicUrl: 'https://vetny-rozbor.live.ptbk.io/',
                localUrl: 'http://127.0.0.1:41145/',
            }),
        ).rejects.toThrow(/Failed to delete the pm2 process/);

        expect(recordedCommands.map((recordedCommand) => recordedCommand.arguments[0])).not.toContain('start');
    });
});
