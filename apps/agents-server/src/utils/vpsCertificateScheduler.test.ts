import {
    ensureAutomaticVpsCertificateSchedulerBootstrapped,
    VPS_CERTIFICATE_MAINTENANCE_INTERVAL_MS,
} from './vpsCertificateScheduler';

describe('vpsCertificateScheduler', () => {
    it('keeps the maintenance interval within Let\'s Encrypt-safe bounds', () => {
        // At least an hour keeps repeated attempts for a domain whose DNS is not
        // ready yet well below the Let's Encrypt failed-validation rate limit, and
        // at most a day renews certificates well inside the 30-day renewal window.
        expect(VPS_CERTIFICATE_MAINTENANCE_INTERVAL_MS).toBeGreaterThanOrEqual(60 * 60 * 1000);
        expect(VPS_CERTIFICATE_MAINTENANCE_INTERVAL_MS).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
    });

    it('never arms certificate maintenance while tests are running', () => {
        // `JEST_WORKER_ID` is defined while jest runs, so the runtime guard must
        // keep the scheduler completely inert. Bootstrapping (even repeatedly) must
        // never arm a timer that would call the shared installer script during CI.
        jest.useFakeTimers();

        try {
            const armedTimersBeforeBootstrap = jest.getTimerCount();

            ensureAutomaticVpsCertificateSchedulerBootstrapped();
            ensureAutomaticVpsCertificateSchedulerBootstrapped();

            expect(jest.getTimerCount()).toBe(armedTimersBeforeBootstrap);
        } finally {
            jest.useRealTimers();
        }
    });
});
