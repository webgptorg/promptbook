import { readFile, readdir } from 'fs/promises';
import type { Dirent } from 'fs';
import { join } from 'path';

// cspell:ignore Procfile

/** Runtime/dependency/history directories do not contain maintained project callers. */
const IGNORED_CALLER_DIRECTORIES = new Set([
    'node_modules',
    '.git',
    '.promptbook',
    '.next',
    '.tmp',
    'dist',
    'build',
    'coverage',
]);

/** Only Coder's known task-history paths are excluded; the same names elsewhere can hold active callers. */
const IGNORED_CALLER_HISTORY_PATHS = new Set(['prompts/done', 'prompts/traces']);

/** Source and workflow files whose references must be preserved during npm script migration. */
const CALLER_FILE_PATTERN = /\.(?:[cm]?jsx?|tsx?|json|ya?ml|md|sh|bash|ps1|cmd|bat|py|toml|xml|groovy)$/iu;

/** Conventional workflow files which have no filename extension. */
const CALLER_FILE_NAMES = new Set(['Makefile', 'Dockerfile', 'Jenkinsfile', 'Procfile']);

/**
 * Finds external project callers conservatively; it never rewrites their shell expressions.
 * @private migration safety check for the Coder initializer
 */
export async function findLegacyCoderCheckCallers(
    projectPath: string,
    legacyNames: ReadonlyArray<string>,
): Promise<Readonly<Record<string, ReadonlyArray<string>>>> {
    const callers: Record<string, string[]> = Object.fromEntries(legacyNames.map((name) => [name, []]));
    if (legacyNames.length === 0) return callers;

    /** Scans maintained text files without following symlinks or inspecting runtime state. */
    async function visit(relativeDirectory: string): Promise<void> {
        let entries: Dirent[];
        try {
            entries = await readdir(join(projectPath, relativeDirectory), { withFileTypes: true });
        } catch {
            for (const legacyName of legacyNames)
                callers[legacyName]!.push(`${relativeDirectory} (unreadable directory; review manually)`);
            return;
        }
        for (const entry of entries) {
            const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
            if (entry.isSymbolicLink()) {
                if (!IGNORED_CALLER_DIRECTORIES.has(entry.name)) {
                    for (const legacyName of legacyNames)
                        callers[legacyName]!.push(`${relativePath} (symbolic link; review manually)`);
                }
                continue;
            }
            if (entry.isDirectory()) {
                if (!IGNORED_CALLER_DIRECTORIES.has(entry.name) && !IGNORED_CALLER_HISTORY_PATHS.has(relativePath))
                    await visit(relativePath);
            } else if (entry.isFile() && (CALLER_FILE_PATTERN.test(entry.name) || CALLER_FILE_NAMES.has(entry.name))) {
                try {
                    let content = await readFile(join(projectPath, relativePath), 'utf-8');
                    if (relativePath === 'package.json') {
                        // Script callers are already handled by the merge. Other project-owned metadata may also
                        // reference a script, so it must be included when deciding whether removal is safe.
                        const packageMetadata = JSON.parse(content);
                        delete packageMetadata.scripts;
                        content = JSON.stringify(packageMetadata);
                    }
                    for (const legacyName of legacyNames) {
                        if (content.includes(legacyName))
                            callers[legacyName]!.push(
                                relativePath === 'package.json' ? 'package.json (outside scripts)' : relativePath,
                            );
                    }
                } catch {
                    // An unreadable file cannot prove that deletion is safe. Keep the entry and explain why.
                    for (const legacyName of legacyNames)
                        callers[legacyName]!.push(`${relativePath} (unreadable; review manually)`);
                }
            }
        }
    }
    await visit('');
    return callers;
}
