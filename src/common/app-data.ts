import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * The current OS user's Promptbook application-data directory (`PTBK_HOME` overrides it).
 *
 * It holds machine-local, per-user data outside any project: the managed global browser profile, cross-project
 * profile claims, the host-wide service discovery registry and the durable known-project registry.
 *
 * @private application data
 */
export function promptbookAppData(env: NodeJS.ProcessEnv = process.env): string {
    if (env.PTBK_HOME) return env.PTBK_HOME;
    if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support', 'Promptbook');
    if (process.platform === 'win32') return join(env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'Promptbook');
    return join(env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'promptbook');
}
