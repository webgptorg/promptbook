import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { runTests } from './run-tests';

jest.mock('node:child_process', () => ({ spawn: jest.fn() }));

/**
 * Started npm child with controllable streams and shutdown events.
 */
type TestChild = EventEmitter & {
    stdout: PassThrough;
    stderr: PassThrough;
};

/**
 * Mock npm process launcher used to verify scheduling and failure propagation.
 */
const spawnMock = spawn as jest.MockedFunction<typeof spawn>;

/**
 * npm script names selected by the runner, in launch order.
 */
function launchedScripts(): string[] {
    return spawnMock.mock.calls.map((call) => (call[1] as string[])[1]!);
}

/**
 * Creates an npm child whose termination is controlled by each regression test.
 */
function createTestChild(): TestChild {
    return Object.assign(new EventEmitter(), {
        stdout: new PassThrough(),
        stderr: new PassThrough(),
    });
}

describe('repository test runner', () => {
    beforeEach(() => {
        spawnMock.mockReset();
        jest.spyOn(console, 'info').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('runs static checks together and waits for every sibling to close after a failure', async () => {
        const children: TestChild[] = [];
        spawnMock.mockImplementation(() => {
            const child = createTestChild();
            children.push(child);
            return child as ReturnType<typeof spawn>;
        });

        let completed = false;
        const result = runTests().then((status) => {
            completed = true;
            return status;
        });
        expect(launchedScripts()).toEqual(['test-name-discrepancies', 'test-spellcheck', 'test-lint', 'test-types']);

        children[0]!.emit('close', 2, null);
        children[1]!.emit('close', 0, null);
        children[2]!.emit('close', 0, null);
        await Promise.resolve();
        expect(completed).toBe(false);
        const diagnostics = Buffer.from('typecheck diagnostics: žluťoučký\n');
        children[3]!.stderr.write(diagnostics.subarray(0, 24));
        children[3]!.stderr.write(diagnostics.subarray(24));
        children[3]!.emit('close', 0, null);

        await expect(result).resolves.toBe(2);
        expect(spawnMock).toHaveBeenCalledTimes(4);
        expect(process.stdout.write).toHaveBeenCalledWith('typecheck diagnostics: žluťoučký\n');
    });

    it('finishes generation before starting unit tests and preserves the full test scope', async () => {
        let generationClosed = false;
        spawnMock.mockImplementation((_executable, args) => {
            const script = (args as string[])[1];
            if (script === 'test-unit') {
                expect(generationClosed).toBe(true);
            }
            const child = createTestChild();
            queueMicrotask(() => {
                if (script === 'test-package-generation') {
                    generationClosed = true;
                }
                child.emit('close', 0, null);
            });
            return child as ReturnType<typeof spawn>;
        });

        await expect(runTests()).resolves.toBe(0);
        expect(launchedScripts().slice(4)).toEqual([
            'test-books',
            'test-book-components-build',
            'test-package-generation',
            'test-unit',
            'test-app-agents-server',
        ]);
    });

    it('does not launch unit or browser tests when package generation fails', async () => {
        spawnMock.mockImplementation((_executable, args) => {
            const child = createTestChild();
            queueMicrotask(() =>
                child.emit('close', (args as string[])[1] === 'test-package-generation' ? 7 : 0, null),
            );
            return child as ReturnType<typeof spawn>;
        });

        await expect(runTests()).resolves.toBe(7);
        expect(launchedScripts()).not.toContain('test-unit');
        expect(launchedScripts()).not.toContain('test-app-agents-server');
    });

    it.each([false, true])('preserves the reduced test scope with withoutUnit=%s', async (withoutUnit) => {
        spawnMock.mockImplementation(() => {
            const child = createTestChild();
            queueMicrotask(() => child.emit('close', 0, null));
            return child as ReturnType<typeof spawn>;
        });

        await expect(runTests({ withoutPackageGeneration: true, withoutUnit })).resolves.toBe(0);
        expect(launchedScripts()).not.toContain('test-package-generation');
        expect(launchedScripts()).not.toContain('test-app-agents-server');
        expect(launchedScripts().includes('test-unit')).toBe(!withoutUnit);
    });

    it.each(['startup error', 'signal'])(
        'fails when a child terminates with %s instead of an exit code',
        async (failure) => {
            spawnMock.mockImplementation((_executable, args) => {
                const child = createTestChild();
                queueMicrotask(() => {
                    if ((args as string[])[1] !== 'test-lint') {
                        child.emit('close', 0, null);
                    } else if (failure === 'startup error') {
                        child.emit('error', new Error('npm could not start'));
                        child.emit('close', -1, null);
                    } else {
                        child.emit('close', null, 'SIGTERM');
                    }
                });
                return child as ReturnType<typeof spawn>;
            });

            await expect(runTests()).resolves.toBe(1);
            expect(spawnMock).toHaveBeenCalledTimes(4);
        },
    );
});
