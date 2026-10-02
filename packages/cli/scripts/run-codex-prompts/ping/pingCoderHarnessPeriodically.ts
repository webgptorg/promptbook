import colors from 'colors';
import { formatUnknownErrorMessage } from '../common/formatUnknownErrorMessage';
import { formatDurationMs } from '../common/parseDuration';
import { waitUntilWorldTimeDeadline } from '../common/waitUntilWorldTimeDeadline';
import type { PingCoderHarnessOptions } from './pingCoderHarness';
import { pingCoderHarness } from './pingCoderHarness';
import { printCoderPingResult } from './printCoderPingResult';

/**
 * How often the countdown to the next periodic ping is reported to the console (30 minutes).
 *
 * A period like `5h` is meant to be left running unattended, so the countdown is deliberately
 * coarse — it is a sign of life, not a progress bar.
 */
const CODER_PING_COUNTDOWN_UPDATE_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Options for the endless `ptbk coder ping --period <duration>` loop.
 */
export type PingCoderHarnessPeriodicallyOptions = PingCoderHarnessOptions & {
    /**
     * How long one ping period lasts, in milliseconds.
     *
     * The period is measured from the start of one ping to the start of the next one, so the pings
     * really happen once per period instead of once per period plus the duration of the ping itself.
     */
    readonly periodMs: number;
};

/**
 * Pings the selected harness and model once per period until the process is stopped.
 *
 * This keeps the quota window of the harness refreshing without any real work, so the window is
 * always open by the time you need it. The loop never ends on its own — it is stopped with `CTRL+C`
 * or by killing the process — therefore a failing ping is reported and the next period is started
 * instead of tearing the whole loop down.
 */
export async function pingCoderHarnessPeriodically(options: PingCoderHarnessPeriodicallyOptions): Promise<never> {
    const { periodMs, ...pingOptions } = options;

    console.info(colors.gray(`🏓 Pinging every ${formatDurationMs(periodMs)} until stopped with CTRL+C`));

    // Note: The loop is intentionally endless - only `CTRL+C` or killing the process ends it
    for (;;) {
        const nextPingTimeMs = Date.now() + periodMs;

        await reportOneCoderPing(pingOptions);
        await waitUntilNextCoderPing(nextPingTimeMs);
    }
}

/**
 * Sends and reports one ping of the endless loop, keeping the loop alive when the harness fails.
 */
async function reportOneCoderPing(options: PingCoderHarnessOptions): Promise<void> {
    try {
        printCoderPingResult(await pingCoderHarness(options));
    } catch (error) {
        console.error(colors.red(`🏓 Ping failed: ${formatUnknownErrorMessage(error)}`));
    }
}

/**
 * Waits until the wall-clock time of the next ping, reporting how much of the period is left.
 */
async function waitUntilNextCoderPing(nextPingTimeMs: number): Promise<void> {
    await waitUntilWorldTimeDeadline({
        deadlineTimeMs: nextPingTimeMs,
        pollIntervalMs: CODER_PING_COUNTDOWN_UPDATE_INTERVAL_MS,
        onTick(remainingDurationMs) {
            console.info(colors.gray(`   Next ping in ${formatDurationMs(remainingDurationMs)}`));
        },
    });
}
