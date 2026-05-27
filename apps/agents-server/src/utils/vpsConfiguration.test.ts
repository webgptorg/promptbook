import { createVpsInstallerCommandEnvironment } from './vpsConfiguration';

/**
 * Original restart-skip flag restored after each environment-mutating test.
 */
const ORIGINAL_PTBK_SKIP_PM2_RESTART = process.env.PTBK_SKIP_PM2_RESTART;

describe('vpsConfiguration', () => {
    afterEach(() => {
        if (ORIGINAL_PTBK_SKIP_PM2_RESTART === undefined) {
            delete process.env.PTBK_SKIP_PM2_RESTART;
        } else {
            process.env.PTBK_SKIP_PM2_RESTART = ORIGINAL_PTBK_SKIP_PM2_RESTART;
        }
    });

    it('skips pm2 restarts when applying VPS runtime configuration from an active request', () => {
        delete process.env.PTBK_SKIP_PM2_RESTART;

        const environment = createVpsInstallerCommandEnvironment({ isProcessRestartEnabled: false });

        expect(environment.PTBK_NON_INTERACTIVE).toBe('1');
        expect(environment.PTBK_SKIP_PM2_RESTART).toBe('1');
    });

    it('does not force the pm2 restart skip flag by default', () => {
        delete process.env.PTBK_SKIP_PM2_RESTART;

        const environment = createVpsInstallerCommandEnvironment();

        expect(environment.PTBK_NON_INTERACTIVE).toBe('1');
        expect(environment.PTBK_SKIP_PM2_RESTART).toBeUndefined();
    });
});
