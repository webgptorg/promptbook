import { DEFAULT_PROGRESSIVE_BACKOFF_DELAYS_MS, ProgressiveBackoff } from './ProgressiveBackoff';

describe('ProgressiveBackoff', () => {
    it('uses the default progressive schedule before hitting the cap', () => {
        const backoff = new ProgressiveBackoff({
            jitterRatio: 0,
            random: () => 0.5,
        });

        const delays = DEFAULT_PROGRESSIVE_BACKOFF_DELAYS_MS.map(() => backoff.nextDelayMs());

        expect(delays).toEqual(DEFAULT_PROGRESSIVE_BACKOFF_DELAYS_MS);
    });

    it('keeps using the capped maximum delay after schedule is exhausted', () => {
        const backoff = new ProgressiveBackoff({
            delaysMs: [1000],
            maxDelayMs: 1000,
            jitterRatio: 0,
            random: () => 0.5,
        });

        expect(backoff.nextDelayMs()).toBe(1000);
        expect(backoff.nextDelayMs()).toBe(1000);
        expect(backoff.nextDelayMs()).toBe(1000);
    });

    it('applies deterministic jitter with provided random source', () => {
        const backoff = new ProgressiveBackoff({
            delaysMs: [1000],
            jitterRatio: 0.1,
            random: () => 1,
        });

        expect(backoff.nextDelayMs()).toBe(1100);
    });

    it('resets retry count and delay progression after success', () => {
        const backoff = new ProgressiveBackoff({
            delaysMs: [1000, 2000],
            jitterRatio: 0,
            random: () => 0.5,
        });

        expect(backoff.nextDelayMs()).toBe(1000);
        expect(backoff.retryCount).toBe(1);
        expect(backoff.nextDelayMs()).toBe(2000);
        expect(backoff.retryCount).toBe(2);

        backoff.reset();

        expect(backoff.retryCount).toBe(0);
        expect(backoff.nextDelayMs()).toBe(1000);
    });
});
