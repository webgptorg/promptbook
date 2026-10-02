import { spawn, spawnSync, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import { $resolveInstalledHarnessVersion } from './$resolveInstalledHarnessVersion';
import { getHarnessDefinition } from './HarnessDefinition';

// cspell:ignore taskkill

jest.mock('child_process', () => ({ spawn: jest.fn(), spawnSync: jest.fn() }));

describe('bounded shared harness discovery', () => {
    let child: ChildProcess;
    beforeEach(() => {
        jest.useFakeTimers();
        child = Object.assign(new EventEmitter(), {
            pid: 43210,
            exitCode: null,
            signalCode: null,
            stdout: new PassThrough(),
            stderr: new PassThrough(),
            kill: jest.fn(() => true),
        }) as unknown as ChildProcess;
        jest.mocked(spawn).mockReturnValue(child);
        jest.spyOn(process, 'kill').mockImplementation(() => {
            child.emit('close', null);
            return true;
        });
        jest.mocked(spawnSync).mockImplementation(() => {
            child.emit('close', null);
            return {} as ReturnType<typeof spawnSync>;
        });
    });
    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    it('uses explicit environment and version arguments without changing the parent environment', async () => {
        const previous = process.env.PTBK_PROBE_FIXTURE;
        const result = $resolveInstalledHarnessVersion(getHarnessDefinition('openai-codex'), {
            environment: { PTBK_PROBE_FIXTURE: 'isolated' },
        });
        child.stdout!.emit('data', Buffer.from('codex-cli 0.116.0'));
        child.emit('close', 0);
        await expect(result).resolves.toBe('0.116.0');
        expect(spawn).toHaveBeenCalledWith(
            'codex',
            ['--version'],
            expect.objectContaining({
                env: expect.objectContaining({ PTBK_PROBE_FIXTURE: 'isolated' }),
                detached: process.platform !== 'win32',
            }),
        );
        expect(process.env.PTBK_PROBE_FIXTURE).toBe(previous);
        expect(jest.getTimerCount()).toBe(0);
    });

    it('terminates only the exact owned process tree when an optional probe times out', async () => {
        const result = $resolveInstalledHarnessVersion(getHarnessDefinition('github-copilot'));
        await jest.advanceTimersByTimeAsync(30_000);
        await expect(result).resolves.toBeNull();
        if (process.platform === 'win32')
            expect(spawnSync).toHaveBeenCalledWith('taskkill.exe', ['/PID', '43210', '/T', '/F'], expect.anything());
        else expect(process.kill).toHaveBeenCalledWith(-43210, 'SIGKILL');
        expect(jest.getTimerCount()).toBe(0);
    });

    it('cancels discovery on supervisor shutdown and never reports cancelled output as installed', async () => {
        const controller = new AbortController();
        const result = $resolveInstalledHarnessVersion(getHarnessDefinition('openai-codex'), {
            signal: controller.signal,
        });
        child.stdout!.emit('data', Buffer.from('codex-cli 0.116.0'));
        controller.abort();
        await expect(result).resolves.toBeNull();
        expect(jest.getTimerCount()).toBe(0);
    });
});
