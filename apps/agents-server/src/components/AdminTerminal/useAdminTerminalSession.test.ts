import { mergeAdminTerminalSessionSnapshot, type AdminTerminalSession } from './useAdminTerminalSession';

/**
 * Creates a minimal terminal-session snapshot for merge tests.
 */
function createTerminalSession(overrides: Partial<AdminTerminalSession> = {}): AdminTerminalSession {
    return {
        id: 'session-1',
        isRunning: true,
        output: '',
        startedAt: '2026-06-01T00:00:00.000Z',
        finishedAt: null,
        exitCode: null,
        signal: null,
        ...overrides,
    };
}

describe('mergeAdminTerminalSessionSnapshot', () => {
    it('keeps newer streamed output when a write acknowledgement returns an older prefix', () => {
        const currentSession = createTerminalSession({
            output: 'abc',
        });
        const nextSession = createTerminalSession({
            isRunning: false,
            output: 'ab',
            finishedAt: '2026-06-01T00:00:01.000Z',
            exitCode: 0,
        });

        expect(mergeAdminTerminalSessionSnapshot(currentSession, nextSession)).toEqual({
            ...nextSession,
            output: 'abc',
        });
    });

    it('accepts newer acknowledgement output when it extends the current output', () => {
        const currentSession = createTerminalSession({
            output: 'ab',
        });
        const nextSession = createTerminalSession({
            output: 'abc',
        });

        expect(mergeAdminTerminalSessionSnapshot(currentSession, nextSession)).toBe(nextSession);
    });

    it('accepts snapshots for a different session', () => {
        const currentSession = createTerminalSession({
            id: 'session-1',
            output: 'abc',
        });
        const nextSession = createTerminalSession({
            id: 'session-2',
            output: 'a',
        });

        expect(mergeAdminTerminalSessionSnapshot(currentSession, nextSession)).toBe(nextSession);
    });
});
