import { randomBytes } from 'crypto';
import { parse } from 'dotenv';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join, relative } from 'path';
import { NotAllowed } from '../../../src/errors/NotAllowed';
import { resolveAgentsServerSqliteDatabasePath } from '../../../apps/agents-server/src/database/sqlite/resolveAgentsServerSqliteDatabasePath';
import { resolveServerSqliteDatabasePath } from '../../../apps/agents-server/src/database/sqlite/resolveServerSqliteDatabasePath';
import { resolveConfinedWorkspacePath } from './workspaceAgentFiles';

/** Stable local secure bootstrap credential location, excluded from Git and packages. */
export const WORKSPACE_SERVER_SECRETS_PATH = '.promptbook/secrets/agents-server.env';

/** Reads project environment as data; concurrent projects never mutate process.env. */
export async function readWorkspaceEnvironment(projectPath: string): Promise<NodeJS.ProcessEnv> {
    const content = await readFile(join(projectPath, '.env'), 'utf-8').catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return '';
        throw error;
    });
    return { ...parse(content), ...process.env };
}

/** Resolves registry and isolated operational paths through the existing SQLite helpers, explicitly under this project. */
export function resolveWorkspaceStoragePaths(projectPath: string, environment: NodeJS.ProcessEnv) {
    const registryPath = resolveAgentsServerSqliteDatabasePath({ projectPath, environment });
    const relativePath = relative(join(projectPath, '.promptbook'), registryPath);
    if (!relativePath || relativePath.startsWith('..') || relativePath.startsWith('/'))
        throw new NotAllowed(
            "Workspace SQLite state must be stored beneath this project's .promptbook directory. Set PTBK_AGENTS_SERVER_SQLITE_PATH accordingly.",
        );
    return { registryPath, databasePath: resolveServerSqliteDatabasePath('', { projectPath, environment }) };
}

/**
 * Reuses the app's secure admin/session mechanisms with project-specific random credentials persisted across restarts.
 * Explicit credentials remain authoritative. Nothing is emitted to logs except the private file location.
 */
export async function createWorkspaceServerEnvironment(
    projectPath: string,
    environment: NodeJS.ProcessEnv,
): Promise<NodeJS.ProcessEnv> {
    const path = await resolveConfinedWorkspacePath(projectPath, WORKSPACE_SERVER_SECRETS_PATH, '.promptbook');
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    let saved = await readFile(path, 'utf-8').catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return null;
        throw error;
    });
    if (saved === null) {
        saved = `ADMIN_PASSWORD=${randomBytes(32).toString('hex')}\nSESSION_SECRET=${randomBytes(48).toString(
            'hex',
        )}\n`;
        await writeFile(path, saved, { flag: 'wx', mode: 0o600 });
    }
    return {
        ...environment,
        ADMIN_PASSWORD: environment.ADMIN_PASSWORD || parse(saved).ADMIN_PASSWORD,
        SESSION_SECRET: environment.SESSION_SECRET || parse(saved).SESSION_SECRET,
        PTBK_AGENTS_SERVER_DATABASE: 'sqlite',
        PTBK_AGENTS_SERVER_WORKSPACE: projectPath,
        SUPABASE_TABLE_PREFIX: '',
        PTBK_HOSTNAME: '127.0.0.1',
        NEXT_PUBLIC_SITE_URL: undefined,
    };
}

// Note: [🟡] Workspace startup environment is only published in `@promptbook/cli`.
// Note: [💞] Ignore a discrepancy between file name and exported helper names
