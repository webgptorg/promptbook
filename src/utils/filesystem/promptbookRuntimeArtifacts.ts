/**
 * Private runtime directories. Versioned configuration beside these directories remains visible to Git.
 * @private shared workspace and package exclusion policy
 */
export const PROMPTBOOK_RUNTIME_DIRECTORIES = [
    'agent',
    'agent-messages',
    'agents-server',
    'chat-sessions',
    'coder-plan',
    'coder-prompts',
    'coder-ping',
    'coder-isolation-worktrees',
    'ptbk-coder',
    'logs',
    'secrets',
    'scripts',
] as const;

/**
 * Narrow project-relative Git/npm exclusions for SQLite, leases, credentials and generated runtime artifacts.
 * @private shared project bootstrap and packaging configuration
 */
export const PROMPTBOOK_RUNTIME_IGNORE_RULES: ReadonlyArray<string> = [
    ...PROMPTBOOK_RUNTIME_DIRECTORIES.map((directory) => `/.promptbook/${directory}/`),
    '/.promptbook/**/*.sqlite',
    '/.promptbook/**/*.sqlite3',
    '/.promptbook/**/*.db',
    '/.promptbook/**/*.sqlite-*',
    '/.promptbook/**/*.sqlite3-*',
    '/.promptbook/**/*.db-*',
    '/.promptbook/*.lock',
    '/.promptbook/*.lock/',
    '/.promptbook/*.lock.recovered-*/',
    '/.env',
];

/**
 * Detects private artifacts during recursive runtime packaging, including databases outside the standard directory.
 * @private exported for CLI runtime/package generation
 */
export function isPromptbookRuntimeArtifact(path: string): boolean {
    const parts = path.replace(/\\/gu, '/').split('/');
    const name = parts.at(-1) ?? '';
    if (name.startsWith('.env') || /\.(?:sqlite3?|db)(?:-(?:wal|shm|journal))?$/iu.test(name)) return true;
    const rootIndex = parts.indexOf('.promptbook');
    if (rootIndex < 0) return false;
    const localPath = parts.slice(rootIndex + 1);
    return (
        PROMPTBOOK_RUNTIME_DIRECTORIES.some((directory) => localPath[0] === directory) ||
        localPath.some((part) => /\.lock(?:$|\.recovered-)/u.test(part)) ||
        /\.(?:log|tmp)$/u.test(name)
    );
}

// Note: [💞] Runtime exclusion constants and predicate share one policy.
