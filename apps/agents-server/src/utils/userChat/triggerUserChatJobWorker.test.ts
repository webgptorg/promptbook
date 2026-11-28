import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { triggerUserChatJobWorker } from './triggerUserChatJobWorker';

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_WORKER_TOKEN = process.env.PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN;

describe('triggerUserChatJobWorker', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(Math, 'random').mockReturnValue(0);
        Reflect.set(process.env, 'PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN', 'test-worker-token');
    });

    afterEach(() => {
        globalThis.fetch = ORIGINAL_FETCH;
        restoreEnvironmentVariable('PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN', ORIGINAL_WORKER_TOKEN);
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    it('retries transient fetch failures before giving up on waking the worker', async () => {
        const fetchMock = jest
            .fn<typeof fetch>()
            .mockRejectedValueOnce(new TypeError('fetch failed'))
            .mockResolvedValueOnce(new Response(null, { status: 204 }));
        globalThis.fetch = fetchMock;

        const triggerPromise = triggerUserChatJobWorker({
            origin: 'https://agents.example/',
            preferredJobId: 'job-1',
        });

        await Promise.resolve();

        expect(fetchMock).toHaveBeenCalledTimes(1);

        await jest.advanceTimersByTimeAsync(250);
        await triggerPromise;

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock).toHaveBeenLastCalledWith(
            new URL('https://agents.example/api/internal/user-chat-jobs/run'),
            expect.objectContaining({
                method: 'POST',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-chat-worker-token': 'test-worker-token',
                },
                body: JSON.stringify({
                    preferredJobId: 'job-1',
                }),
            }),
        );
    });
});

/**
 * Restores one environment variable after test mutation.
 *
 * @param envName - Environment variable name.
 * @param value - Original value before the test changed it.
 */
function restoreEnvironmentVariable(
    envName: 'PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN',
    value: string | undefined,
): void {
    if (value === undefined) {
        delete process.env[envName];
        return;
    }

    Reflect.set(process.env, envName, value);
}
