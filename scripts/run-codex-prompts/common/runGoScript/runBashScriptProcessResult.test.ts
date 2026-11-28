import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import type { ChildProcessWithoutNullStreams } from 'child_process';
import { $spawnLoggedBashScript } from './$spawnLoggedBashScript';
import { runBashScriptWithOutput } from './runBashScriptWithOutput';
import { appendScriptExecutionLogFinish } from './scriptExecutionLog';

jest.mock('./$spawnLoggedBashScript', () => ({ $spawnLoggedBashScript: jest.fn() }));
jest.mock('./scriptExecutionLog', () => ({
    appendScriptExecutionLogStart: jest.fn(),
    appendScriptExecutionLogFinish: jest.fn(),
}));

describe('shared shell process result', () => {
    it('rejects cancellation received while completing a successful process log', async () => {
        const controller = new AbortController();
        const processEvents = new EventEmitter();
        const stdout = new PassThrough();
        const stderr = new PassThrough();
        Object.assign(processEvents, { stdout, stderr, exitCode: 0, signalCode: null });
        jest.mocked($spawnLoggedBashScript).mockReturnValue(processEvents as ChildProcessWithoutNullStreams);
        let finishFooter!: () => void;
        const footer = new Promise<void>((resolve) => {
            finishFooter = resolve;
        });
        jest.mocked(appendScriptExecutionLogFinish).mockReturnValueOnce(footer);
        const result = runBashScriptWithOutput({
            scriptPath: 'fixture.check.sh',
            scriptContent: '',
            shouldPrintLiveOutput: false,
            signal: controller.signal,
        });
        await new Promise<void>((resolve) => setImmediate(resolve));
        stdout.write('All checks passed!\n');
        processEvents.emit('close', 0, null);
        controller.abort(new Error('Check cancelled before completion'));
        finishFooter();
        await expect(result).rejects.toThrow('Check cancelled before completion');
    });

    it.each([
        [1, null],
        [null, 'SIGTERM'],
        [0, 'SIGTERM'],
    ] as const)('rejects code %s and signal %s despite green output', async (code, signal) => {
        const processEvents = new EventEmitter();
        const stdout = new PassThrough();
        const stderr = new PassThrough();
        Object.assign(processEvents, { stdout, stderr });
        jest.mocked($spawnLoggedBashScript).mockReturnValue(processEvents as ChildProcessWithoutNullStreams);
        const result = runBashScriptWithOutput({
            scriptPath: 'fixture.check.sh',
            scriptContent: '',
            shouldPrintLiveOutput: false,
        });
        await new Promise<void>((resolve) => setImmediate(resolve));
        stdout.write('All tests passed!\n');
        stderr.write('build tool failure details\n');
        processEvents.emit('close', code, signal);
        await expect(result).rejects.toThrow('build tool failure details');
    });

    it('rejects a spawn failure', async () => {
        jest.mocked($spawnLoggedBashScript).mockImplementation(() => {
            throw new Error('spawn ENOENT');
        });
        await expect(runBashScriptWithOutput({ scriptPath: 'fixture.check.sh', scriptContent: '' })).rejects.toThrow(
            'spawn ENOENT',
        );
    });

    it('keeps tool output when an asynchronous process error precedes a successful-looking close', async () => {
        const processEvents = new EventEmitter();
        const stdout = new PassThrough();
        const stderr = new PassThrough();
        Object.assign(processEvents, { stdout, stderr });
        jest.mocked($spawnLoggedBashScript).mockReturnValue(processEvents as ChildProcessWithoutNullStreams);
        const result = runBashScriptWithOutput({
            scriptPath: 'fixture.check.sh',
            scriptContent: '',
            shouldPrintLiveOutput: false,
        });
        await new Promise<void>((resolve) => setImmediate(resolve));
        stdout.write('All tests passed!\n');
        stderr.write('build failure details\n');
        processEvents.emit('error', new Error('process failed'));
        processEvents.emit('close', 0, null);
        await expect(result).rejects.toThrow('build failure details');
    });
});
