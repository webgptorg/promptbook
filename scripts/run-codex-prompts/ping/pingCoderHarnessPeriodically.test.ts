import { ZERO_USAGE } from '../../../src/execution/utils/usage-constants';
import { waitUntilWorldTimeDeadline } from '../common/waitUntilWorldTimeDeadline';
import type { CoderPingResult } from './CoderPingResult';
import { pingCoderHarness } from './pingCoderHarness';
import { pingCoderHarnessPeriodically } from './pingCoderHarnessPeriodically';
import { printCoderPingResult } from './printCoderPingResult';

jest.mock('./pingCoderHarness', () => ({
    pingCoderHarness: jest.fn(),
}));

jest.mock('./printCoderPingResult', () => ({
    printCoderPingResult: jest.fn(),
}));

jest.mock('../common/waitUntilWorldTimeDeadline', () => ({
    waitUntilWorldTimeDeadline: jest.fn(),
}));

/**
 * Period used by the tests, matching the Claude Code quota window the option was built for.
 */
const PING_PERIOD_MS = 5 * 60 * 60 * 1000;

/**
 * Wall-clock time the mocked clock starts at.
 */
const START_TIME_MS = 1_700_000_000_000;

/**
 * How long one mocked ping takes, so the pacing of the period can be observed.
 */
const PING_DURATION_MS = 60 * 1000;

/**
 * How many pings each test lets the endless loop send before it stops it.
 */
const EXPECTED_PING_COUNT = 3;

/**
 * Error which stops the endless ping loop in the tests, standing in for `CTRL+C`.
 */
const LOOP_STOP_ERROR = new Error('Stopped the endless ping loop');

/**
 * Result the mocked harness ping reports.
 */
const CODER_PING_RESULT: CoderPingResult = {
    runnerName: 'Claude Code',
    modelName: 'claude-sonnet-5',
    thinkingLevel: 'low',
    answer: '42',
    isAnswerCorrect: true,
    durationMs: PING_DURATION_MS,
    usage: ZERO_USAGE,
};

/**
 * Typed Jest mock of one harness ping.
 */
function getPingCoderHarnessMock(): jest.MockedFunction<typeof pingCoderHarness> {
    return pingCoderHarness as jest.MockedFunction<typeof pingCoderHarness>;
}

/**
 * Typed Jest mock of the wait between two pings.
 */
function getWaitUntilWorldTimeDeadlineMock(): jest.MockedFunction<typeof waitUntilWorldTimeDeadline> {
    return waitUntilWorldTimeDeadline as jest.MockedFunction<typeof waitUntilWorldTimeDeadline>;
}

describe('pingCoderHarnessPeriodically', () => {
    let currentTimeMs: number;
    let dateNowSpy: jest.SpyInstance<number, []>;
    let consoleInfoSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;
    let consoleErrorSpy: jest.SpyInstance<void, [message?: unknown, ...optionalParams: unknown[]]>;

    beforeEach(() => {
        currentTimeMs = START_TIME_MS;
        dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => currentTimeMs);
        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        // Note: Every ping moves the mocked clock forward, so the period can be told apart from the ping itself
        getPingCoderHarnessMock().mockImplementation(async () => {
            currentTimeMs += PING_DURATION_MS;
            return CODER_PING_RESULT;
        });

        // Note: The loop never ends on its own, so the wait stops it once enough pings have been sent
        getWaitUntilWorldTimeDeadlineMock().mockImplementation(async () => {
            if (getPingCoderHarnessMock().mock.calls.length >= EXPECTED_PING_COUNT) {
                throw LOOP_STOP_ERROR;
            }
        });
    });

    afterEach(() => {
        dateNowSpy.mockRestore();
        consoleInfoSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        jest.clearAllMocks();
    });

    it('pings again and again until it is stopped', async () => {
        await expect(
            pingCoderHarnessPeriodically({ agentName: 'claude-code', periodMs: PING_PERIOD_MS }),
        ).rejects.toThrow(LOOP_STOP_ERROR);

        expect(getPingCoderHarnessMock()).toHaveBeenCalledTimes(EXPECTED_PING_COUNT);
        expect(printCoderPingResult).toHaveBeenCalledTimes(EXPECTED_PING_COUNT);
        expect(printCoderPingResult).toHaveBeenCalledWith(CODER_PING_RESULT);
    });

    it('passes the selected harness, model and thinking level to every ping', async () => {
        await expect(
            pingCoderHarnessPeriodically({
                agentName: 'claude-code',
                model: 'claude-sonnet-5',
                thinkingLevel: 'low',
                periodMs: PING_PERIOD_MS,
            }),
        ).rejects.toThrow(LOOP_STOP_ERROR);

        expect(getPingCoderHarnessMock()).toHaveBeenCalledWith({
            agentName: 'claude-code',
            model: 'claude-sonnet-5',
            thinkingLevel: 'low',
        });
    });

    it('measures the period from the start of the ping, not from its end', async () => {
        await expect(
            pingCoderHarnessPeriodically({ agentName: 'claude-code', periodMs: PING_PERIOD_MS }),
        ).rejects.toThrow(LOOP_STOP_ERROR);

        expect(getWaitUntilWorldTimeDeadlineMock()).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ deadlineTimeMs: START_TIME_MS + PING_PERIOD_MS }),
        );
    });

    it('keeps pinging after one ping has failed', async () => {
        getPingCoderHarnessMock().mockRejectedValueOnce(new Error('The harness is not logged in'));

        await expect(
            pingCoderHarnessPeriodically({ agentName: 'claude-code', periodMs: PING_PERIOD_MS }),
        ).rejects.toThrow(LOOP_STOP_ERROR);

        expect(getPingCoderHarnessMock()).toHaveBeenCalledTimes(EXPECTED_PING_COUNT);
        expect(printCoderPingResult).toHaveBeenCalledTimes(EXPECTED_PING_COUNT - 1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('The harness is not logged in'));
    });
});
