import { describe, expect, it } from '@jest/globals';
import childProcess from 'child_process';
import { PassThrough } from 'stream';
import { $execCommand } from './$execCommand';

describe('basic usage of execCommand', () => {
    it(`should pass on simple command`, () =>
        expect(
            $execCommand({
                command: `whoami`,
            }),
        ).resolves.not.toThrowError());

    it(`should crash on unknown command`, () =>
        expect(
            $execCommand({
                command: `unknown-command`,
            }),
        ).rejects.toThrowError(
            /unknown-command/i,
            /*
              <- Note: There is a difference in the error message:
                - On Linux: Command "unknown-command" failed
                - On Windows: 'unknown-command' is not recognized as an internal or external command, operable program or batch file.
            */
        ));
});

describe('execCommand output completion', () => {
    afterEach(() => jest.restoreAllMocks());

    it.each([0, 7])('waits for output streams to close after process exit %s', async (code) => {
        const child = Object.assign(new childProcess.ChildProcess(), {
            stdout: new PassThrough(),
            stderr: new PassThrough(),
        });
        jest.spyOn(childProcess, 'spawn').mockReturnValue(child);
        const completed = jest.fn();
        const execution = $execCommand({ command: 'fixture-command', isVerbose: false });
        void execution.then(completed, completed);

        // Node can emit exit while pipe data is still pending, especially under concurrent test load.
        child.emit('exit', code);
        await Promise.resolve();
        expect(completed).not.toHaveBeenCalled();
        if (code === 0) child.stdout.write('fixture branch\n');
        else child.stderr.write('retained failure diagnostics\n');
        child.emit('close', code);

        if (code === 0) await expect(execution).resolves.toBe('fixture branch');
        else await expect(execution).rejects.toThrow('retained failure diagnostics');
    });
});
