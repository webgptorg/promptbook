import { readFile } from 'node:fs/promises';

/** Cached identity of the package containing this invoked runtime. */
let version: Promise<string> | undefined;

/** Read this installation's engine version without registry, project or global lookups.
 * @private Internal CLI and runtime identity.
 */
export function installedEngineVersion(): Promise<string> {
    version ??= readFile(new URL('../../package.json', import.meta.url), 'utf8').then(text => {
        const manifest = JSON.parse(text) as { version?: unknown };
        if (typeof manifest.version !== 'string' || !manifest.version.trim()) throw new Error('The invoked Promptbook installation has no engine version.');
        return manifest.version;
    });
    return version;
}
