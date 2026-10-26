import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promptbookAppData } from '../common/app-data.js';
import { errorMessage } from '../common/errors.js';
import { ensureDirectory, pathExists } from '../common/fs.js';
import { runProcess, which } from '../common/process.js';

/**
 * Kind of host facility protecting the local unlock secret of a project's encryption root.
 *
 * @private project encryption
 */
export type HostUnlockFacility = 'macos-keychain' | 'windows-dpapi' | 'systemd-creds' | 'insecure-test-file';

/**
 * Stores and loads the local wrapping secret of one project **outside the project**, in an operating-system or service
 * facility available to the engine at unattended startup. Only its nonsecret reference lives in the project. Secrets
 * travel through standard input, never through command arguments, logs or environment variables.
 *
 * @private project encryption
 */
export type HostUnlock = {
    readonly facility: HostUnlockFacility;
    /** Why the facility cannot be used on this host (a specific setup problem), or undefined when it can. */
    readonly problem: () => Promise<string | undefined>;
    readonly store: (reference: string, secret: Buffer) => Promise<void>;
    /** The secret, or undefined when this host has none for the reference (another host, or never provisioned). */
    readonly load: (reference: string) => Promise<Buffer | undefined>;
    readonly remove: (reference: string) => Promise<void>;
};

/**
 * Keychain service name of Promptbook's project unlock secrets.
 */
const KEYCHAIN_SERVICE = 'Promptbook project encryption';

/**
 * The host facility of this platform. `PTBK_HOST_UNLOCK=insecure-test-file` explicitly selects an unprotected file
 * store for automated fixtures only; it is never chosen silently.
 *
 * @private project encryption
 */
export function hostUnlock(env: NodeJS.ProcessEnv = process.env): HostUnlock {
    if (env.PTBK_HOST_UNLOCK === 'insecure-test-file') return insecureFile(env);
    if (process.platform === 'darwin') return macosKeychain(env);
    if (process.platform === 'win32') return windowsDpapi(env);
    return systemdCredentials(env);
}

/**
 * Directory of host-bound unlock material (owner-only app data; never inside a project).
 */
async function hostDirectory(env: NodeJS.ProcessEnv): Promise<string> {
    return await ensureDirectory(join(promptbookAppData(env), 'host-unlock'));
}

/**
 * The macOS login Keychain (available to the user's background services after login).
 */
function macosKeychain(env: NodeJS.ProcessEnv): HostUnlock {
    const security = '/usr/bin/security';
    return {
        facility: 'macos-keychain',
        problem: async () => ((await pathExists(security)) || (await which('security', env)) ? undefined : 'The macOS `security` tool is missing, so the Keychain cannot protect the Wallet key.'),
        store: async (reference, secret) => {
            // `security -i` reads the command from standard input: the secret never appears in a process list.
            const command = `add-generic-password -U -s "${KEYCHAIN_SERVICE}" -a "${reference}" -l "Promptbook project ${reference}" -w ${secret.toString('hex')}\n`;
            const result = await runProcess(security, ['-i'], { cwd: process.cwd(), input: command, timeoutMs: 30_000 });
            if (result.exitCode !== 0 || /error/i.test(result.stderr)) throw new Error(`The Keychain refused to store the Wallet key: ${(result.stderr || result.stdout).trim().slice(0, 300)}`);
        },
        load: async (reference) => {
            const result = await runProcess(security, ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-a', reference, '-w'], { cwd: process.cwd(), timeoutMs: 30_000 });
            const hex = result.stdout.trim();
            return result.exitCode === 0 && /^[0-9a-f]{64}$/i.test(hex) ? Buffer.from(hex, 'hex') : undefined;
        },
        remove: async (reference) => {
            await runProcess(security, ['delete-generic-password', '-s', KEYCHAIN_SERVICE, '-a', reference], { cwd: process.cwd(), timeoutMs: 30_000 });
        },
    };
}

/**
 * Windows DPAPI (current-user scope): the protected blob is bound to this user on this machine and stored in app data.
 */
function windowsDpapi(env: NodeJS.ProcessEnv): HostUnlock {
    const file = async (reference: string): Promise<string> => join(await hostDirectory(env), `${reference}.dpapi`);
    const powershell = ['-NoProfile', '-NonInteractive', '-Command'];
    return {
        facility: 'windows-dpapi',
        problem: async () => ((await which('powershell', env)) ? undefined : 'PowerShell is not available, so Windows data protection cannot protect the Wallet key.'),
        store: async (reference, secret) => {
            const script = '$s = [Console]::In.ReadToEnd().Trim(); ConvertTo-SecureString $s -AsPlainText -Force | ConvertFrom-SecureString';
            const result = await runProcess('powershell', [...powershell, script], { cwd: process.cwd(), input: secret.toString('hex'), timeoutMs: 60_000 });
            if (result.exitCode !== 0 || !result.stdout.trim()) throw new Error(`Windows data protection failed: ${result.stderr.trim().slice(0, 300)}`);
            await writeFile(await file(reference), result.stdout.trim(), { mode: 0o600 });
        },
        load: async (reference) => {
            const blob = await readFile(await file(reference), 'utf8').catch(() => undefined);
            if (!blob) return undefined;
            const script = '$b = [Console]::In.ReadToEnd().Trim(); $s = ConvertTo-SecureString $b; [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))';
            const result = await runProcess('powershell', [...powershell, script], { cwd: process.cwd(), input: blob, timeoutMs: 60_000 });
            const hex = result.stdout.trim();
            return result.exitCode === 0 && /^[0-9a-f]{64}$/i.test(hex) ? Buffer.from(hex, 'hex') : undefined;
        },
        remove: async (reference) => await rm(await file(reference), { force: true }),
    };
}

/**
 * systemd credentials (host key and/or TPM2, user scope where supported): usable by an unattended service on a headless
 * Linux host without an unlocked desktop keyring.
 */
function systemdCredentials(env: NodeJS.ProcessEnv): HostUnlock {
    const file = async (reference: string): Promise<string> => join(await hostDirectory(env), `${reference}.cred`);
    /** `--user` (per-user host key) first, then the system scope. */
    const attempt = async (args: readonly string[], input?: string): Promise<{ readonly ok: boolean; readonly stdout: string; readonly stderr: string }> => {
        let last = { ok: false, stdout: '', stderr: '' };
        for (const scope of [['--user'], []]) {
            const result = await runProcess('systemd-creds', [...scope, ...args], { cwd: process.cwd(), input, timeoutMs: 30_000 });
            last = { ok: result.exitCode === 0, stdout: result.stdout, stderr: result.stderr };
            if (last.ok) return last;
        }
        return last;
    };
    return {
        facility: 'systemd-creds',
        problem: async () => {
            if (!(await which('systemd-creds', env))) return 'This host has no protected credential facility for the Wallet key (systemd-creds is not available). Install systemd 250 or newer, or run the engine where systemd credentials work; plaintext key files are not used.';
            const probe = await attempt(['encrypt', '--name=ptbk-probe', '-', '-'], 'probe');
            return probe.ok ? undefined : `systemd-creds cannot protect the Wallet key for this user: ${probe.stderr.trim().slice(0, 200) || 'unknown error'}. Run the engine with access to the host credential key (or a TPM2); plaintext key files are not used.`;
        },
        store: async (reference, secret) => {
            const target = await file(reference);
            const result = await attempt(['encrypt', `--name=ptbk-${reference}`, '-', target], secret.toString('hex'));
            if (!result.ok) throw new Error(`systemd-creds could not protect the Wallet key: ${result.stderr.trim().slice(0, 300)}`);
        },
        load: async (reference) => {
            const source = await file(reference);
            const result = await attempt(['decrypt', `--name=ptbk-${reference}`, source, '-']);
            const hex = result.stdout.trim();
            return result.ok && /^[0-9a-f]{64}$/i.test(hex) ? Buffer.from(hex, 'hex') : undefined;
        },
        remove: async (reference) => await rm(await file(reference), { force: true }),
    };
}

/**
 * Unprotected file store, only when explicitly selected for automated fixtures (`PTBK_HOST_UNLOCK=insecure-test-file`).
 * It provides no protection and is never used otherwise.
 */
function insecureFile(env: NodeJS.ProcessEnv): HostUnlock {
    const file = async (reference: string): Promise<string> => join(await hostDirectory(env), `${reference}.insecure-test`);
    return {
        facility: 'insecure-test-file',
        problem: async () => undefined,
        store: async (reference, secret) => await writeFile(await file(reference), secret.toString('hex'), { mode: 0o600 }),
        load: async (reference) => {
            const hex = await readFile(await file(reference), 'utf8').catch((error: unknown) => {
                void errorMessage(error);
                return undefined;
            });
            return hex && /^[0-9a-f]{64}$/i.test(hex.trim()) ? Buffer.from(hex.trim(), 'hex') : undefined;
        },
        remove: async (reference) => await rm(await file(reference), { force: true }),
    };
}
