import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    createVpsInstallerCommandEnvironment,
    listVpsEnvironmentVariables,
    updateConfiguredVpsDomains,
    updateVpsEnvironmentVariables,
} from './vpsConfiguration';

/**
 * Original restart-skip flag restored after each environment-mutating test.
 */
const ORIGINAL_PTBK_SKIP_PM2_RESTART = process.env.PTBK_SKIP_PM2_RESTART;
const ORIGINAL_PTBK_AGENTS_SERVER_ENV_FILE = process.env.PTBK_AGENTS_SERVER_ENV_FILE;
const ORIGINAL_NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
const ORIGINAL_PTBK_PUBLIC_IP_ADDRESS = process.env.PTBK_PUBLIC_IP_ADDRESS;

describe('vpsConfiguration', () => {
    afterEach(() => {
        if (ORIGINAL_PTBK_SKIP_PM2_RESTART === undefined) {
            delete process.env.PTBK_SKIP_PM2_RESTART;
        } else {
            process.env.PTBK_SKIP_PM2_RESTART = ORIGINAL_PTBK_SKIP_PM2_RESTART;
        }

        restoreEnvironmentVariable('PTBK_AGENTS_SERVER_ENV_FILE', ORIGINAL_PTBK_AGENTS_SERVER_ENV_FILE);
        restoreEnvironmentVariable('NEXT_PUBLIC_SITE_URL', ORIGINAL_NEXT_PUBLIC_SITE_URL);
        restoreEnvironmentVariable('PTBK_PUBLIC_IP_ADDRESS', ORIGINAL_PTBK_PUBLIC_IP_ADDRESS);
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

    it('keeps the raw-IP site URL while adding the first domain during standalone VPS bootstrap', async () => {
        const tempDirectory = await mkdtemp(join(tmpdir(), 'promptbook-vps-configuration-'));
        const envFilePath = join(tempDirectory, '.env');

        try {
            await writeFile(
                envFilePath,
                ['NEXT_PUBLIC_SITE_URL=http://203.0.113.42', 'PTBK_PUBLIC_IP_ADDRESS=203.0.113.42'].join('\n'),
                'utf-8',
            );

            process.env.PTBK_AGENTS_SERVER_ENV_FILE = envFilePath;
            process.env.NEXT_PUBLIC_SITE_URL = 'http://203.0.113.42';
            process.env.PTBK_PUBLIC_IP_ADDRESS = '203.0.113.42';

            await updateConfiguredVpsDomains(['agents.example.com']);

            const nextEnvFileContent = await readFile(envFilePath, 'utf-8');

            expect(nextEnvFileContent).toContain('SERVERS=agents.example.com');
            expect(nextEnvFileContent).toContain('NEXT_PUBLIC_SITE_URL=http://203.0.113.42');
        } finally {
            await rm(tempDirectory, { recursive: true, force: true });
        }
    });

    it('shows installer-managed database variables as read-only and masks the PostgreSQL URL', async () => {
        const tempDirectory = await mkdtemp(join(tmpdir(), 'promptbook-vps-configuration-'));
        const envFilePath = join(tempDirectory, '.env');

        try {
            await writeFile(
                envFilePath,
                [
                    'PTBK_AGENTS_SERVER_DATABASE=postgres',
                    'POSTGRES_URL=postgresql://promptbook:s3cr3t@example.test:5432/promptbook',
                ].join('\n'),
                'utf-8',
            );

            process.env.PTBK_AGENTS_SERVER_ENV_FILE = envFilePath;

            const snapshot = await listVpsEnvironmentVariables();
            const databaseModeRecord = snapshot.variables.find((variable) => variable.key === 'PTBK_AGENTS_SERVER_DATABASE');
            const postgresUrlRecord = snapshot.variables.find((variable) => variable.key === 'POSTGRES_URL');

            expect(databaseModeRecord).toMatchObject({
                value: 'postgres',
                isEditable: false,
                isDefined: true,
            });
            expect(postgresUrlRecord).toMatchObject({
                value: '********',
                isEditable: false,
                isSensitive: true,
                isDefined: true,
            });
        } finally {
            await rm(tempDirectory, { recursive: true, force: true });
        }
    });

    it('rejects read-only database variables coming from the admin UI', async () => {
        const tempDirectory = await mkdtemp(join(tmpdir(), 'promptbook-vps-configuration-'));
        const envFilePath = join(tempDirectory, '.env');

        try {
            await writeFile(envFilePath, '', 'utf-8');
            process.env.PTBK_AGENTS_SERVER_ENV_FILE = envFilePath;

            await expect(
                updateVpsEnvironmentVariables({
                    PTBK_AGENTS_SERVER_DATABASE: 'sqlite',
                }),
            ).rejects.toThrow('managed by the VPS installer');
        } finally {
            await rm(tempDirectory, { recursive: true, force: true });
        }
    });
});

/**
 * Restores one optional environment variable after a test case.
 *
 * @param key - Environment variable key.
 * @param value - Original value snapshot.
 */
function restoreEnvironmentVariable(key: string, value: string | undefined): void {
    if (value === undefined) {
        delete process.env[key];
        return;
    }

    process.env[key] = value;
}
