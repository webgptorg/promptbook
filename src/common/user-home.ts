import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { lchown, lstat, readdir } from 'node:fs/promises';
import { homedir, userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';

/**
 * The OS account Promptbook acts for and its actual home directory.
 *
 * @private user home and identity
 */
export type IntendedUser = {
    /** Account name when known. */
    readonly name?: string;
    /** Actual home directory of that account. */
    readonly home: string;
    /** POSIX user/group ids of that account when known. */
    readonly uid?: number;
    readonly gid?: number;
    /**
     * `sudo`: the process runs elevated on behalf of the validated original invoking user (its home and project scope
     * are used, not root's); `direct`: the process's own account.
     */
    readonly scope: 'direct' | 'sudo';
    /** Why the original invoking user of an elevated launch could not be validated (the process's own account is used). */
    readonly problem?: string;
};

/**
 * One account record of the system account database.
 */
type AccountRecord = { readonly name: string; readonly uid: number; readonly gid: number; readonly home: string };

/**
 * Looks up an account in the system account database (`getent`/`/etc/passwd` on Linux, directory services on macOS).
 */
function lookupAccount(name: string): AccountRecord | undefined {
    const parse = (line: string): AccountRecord | undefined => {
        const [user, , uid, gid, , home] = line.split(':');
        return user === name && uid && gid && home ? { name: user, uid: Number(uid), gid: Number(gid), home } : undefined;
    };
    if (process.platform === 'darwin') {
        try {
            const read = (key: string): string => execFileSync('dscl', ['.', '-read', `/Users/${name}`, key], { encoding: 'utf8', timeout: 5_000, stdio: ['ignore', 'pipe', 'ignore'] }).replace(new RegExp(`^${key}:\\s*`), '').trim();
            return { name, uid: Number(read('UniqueID')), gid: Number(read('PrimaryGroupID')), home: read('NFSHomeDirectory') };
        } catch {
            return undefined;
        }
    }
    try {
        const found = parse(execFileSync('getent', ['passwd', name], { encoding: 'utf8', timeout: 5_000, stdio: ['ignore', 'pipe', 'ignore'] }).trim());
        if (found) return found;
    } catch {
        // Fall back to the local account file.
    }
    try {
        for (const line of readFileSync('/etc/passwd', 'utf8').split('\n')) {
            const found = parse(line);
            if (found) return found;
        }
    } catch {
        // No local account file.
    }
    return undefined;
}

/**
 * Resolves the intended OS account and its actual home, shared by init defaults, the known-project registry and
 * engine discovery. An ordinary launch uses the current user's home (custom/redirected homes included). A launch
 * through `sudo` on behalf of a non-root user keeps that **original user's** home and scope even when the effective
 * account or `HOME` is root's, but only after validating `SUDO_USER`/`SUDO_UID` against the account database; a
 * direct root launch uses root's own home. No path is hardcoded and no tilde is expanded.
 *
 * @private user home and identity
 */
export function intendedUser(env: NodeJS.ProcessEnv = process.env): IntendedUser {
    const own = (): { name?: string; home: string; uid?: number; gid?: number } => {
        try {
            const info = userInfo();
            // root's actual home, never one inherited through the environment of another user.
            const home = info.uid === 0 ? info.homedir : homedir();
            return { name: info.username, home, ...(info.uid >= 0 ? { uid: info.uid, gid: info.gid } : {}) };
        } catch {
            return { home: homedir() };
        }
    };
    const elevated = process.platform !== 'win32' && typeof process.getuid === 'function' && process.getuid() === 0;
    const sudoUser = env.SUDO_USER?.trim();
    if (!elevated || !sudoUser || sudoUser === 'root') return { ...own(), scope: 'direct' };
    const account = lookupAccount(sudoUser);
    const claimedUid = env.SUDO_UID === undefined ? undefined : Number(env.SUDO_UID);
    if (!account || claimedUid === undefined || account.uid !== claimedUid || !account.home) {
        return { ...own(), scope: 'direct', problem: `The original user of this sudo launch ("${sudoUser}") could not be validated in the account database.` };
    }
    return { name: account.name, home: account.home, uid: account.uid, gid: account.gid, scope: 'sudo' };
}

/**
 * The shared home-based container of new projects: exactly `<home>/PTBK/project/` (uppercase `PTBK`, singular
 * `project`, one child per independent project). It is only a filesystem container, never a project or repository.
 *
 * @private user home and identity
 */
export function sharedProjectsRoot(env: NodeJS.ProcessEnv = process.env): string {
    return join(intendedUser(env).home, 'PTBK', 'project');
}

/**
 * The directories that do not exist yet on the way to a destination (outermost first): exactly what creating it adds.
 *
 * @private user home and identity
 */
export async function missingDirectories(destination: string): Promise<string[]> {
    const missing: string[] = [];
    for (let directory = resolve(destination); ; directory = dirname(directory)) {
        const exists = await lstat(directory).then(
            () => true,
            () => false,
        );
        if (exists || dirname(directory) === directory) break;
        missing.unshift(directory);
    }
    return missing;
}

/**
 * After an elevated (`sudo`) creation on behalf of the original user, hands the directories this operation created,
 * and everything inside the innermost one (the new project), over to that user, so the project is not left root-only.
 * Nothing else is touched: no unrelated or pre-existing path changes ownership. A no-op for ordinary launches.
 *
 * @private user home and identity
 */
export async function handOverCreated(created: readonly string[], user: IntendedUser = intendedUser()): Promise<void> {
    if (user.scope !== 'sudo' || user.uid === undefined || user.gid === undefined || !created.length) return;
    const { uid, gid } = user;
    const walk = async (path: string): Promise<void> => {
        await lchown(path, uid, gid);
        const stats = await lstat(path);
        if (!stats.isDirectory()) return;
        for (const entry of await readdir(path)) await walk(join(path, entry));
    };
    for (const directory of created.slice(0, -1)) await lchown(directory, uid, gid);
    await walk(created[created.length - 1]!);
}
