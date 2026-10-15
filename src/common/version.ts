import { readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Absolute path of the installed `ptbk` package that is actually running.
 *
 * Resolved from this module's location (`dist/common/version.js`), never from the project directory.
 *
 * @private internal engine identity
 */
export const ENGINE_ROOT: string = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Minimal view of the running package manifest.
 */
type EngineManifest = {
    readonly name: string;
    readonly version: string;
};

/**
 * Reads the manifest of the running installation once.
 */
function readEngineManifest(): EngineManifest {
    const manifest = JSON.parse(readFileSync(join(ENGINE_ROOT, 'package.json'), 'utf8')) as Partial<EngineManifest>;
    if (manifest.name !== 'ptbk' || typeof manifest.version !== 'string') {
        throw new Error(`The running installation at ${ENGINE_ROOT} is not a valid ptbk package.`);
    }
    return { name: manifest.name, version: manifest.version };
}

/**
 * Version of the running engine, read from the invoked installation (never hard-coded or fetched).
 *
 * @private internal engine identity
 */
export const ENGINE_VERSION: string = readEngineManifest().version;

/**
 * How the running engine was installed.
 *
 * - `local`: inside a project's `node_modules`
 * - `global`: inside the npm global prefix
 * - `npx`: inside the transient npx cache
 * - `development`: a source checkout (no `node_modules` boundary)
 *
 * @private internal engine identity
 */
export type InstallationScope = 'local' | 'global' | 'npx' | 'development';

/**
 * Description of the invoked installation.
 *
 * @private internal engine identity
 */
export type InstallationInfo = {
    /** Package root of the running engine. */
    readonly root: string;
    /** Engine version from that root. */
    readonly version: string;
    /** Detected installation scope. */
    readonly scope: InstallationScope;
    /** For a local installation, the project directory whose `node_modules` contains the engine. */
    readonly ownerProject?: string;
};

/**
 * Candidate global `node_modules` directories for the Node executable running this process.
 */
function globalModuleDirectories(): string[] {
    const directories: string[] = [];
    const prefix = process.env.npm_config_prefix || process.env.NPM_CONFIG_PREFIX;
    if (process.platform === 'win32') {
        if (prefix) directories.push(join(prefix, 'node_modules'));
        directories.push(join(dirname(process.execPath), 'node_modules'));
        if (process.env.APPDATA) directories.push(join(process.env.APPDATA, 'npm', 'node_modules'));
    } else {
        if (prefix) directories.push(join(prefix, 'lib', 'node_modules'));
        directories.push(join(dirname(dirname(process.execPath)), 'lib', 'node_modules'));
    }
    return directories.map((directory) => resolve(directory).toLowerCase());
}

/**
 * Detects the scope of an installation root.
 *
 * @private internal engine identity
 */
export function detectInstallation(root: string = ENGINE_ROOT, version: string = ENGINE_VERSION): InstallationInfo {
    const normalized = resolve(root);
    const lower = normalized.toLowerCase();
    if (lower.includes(`${sep}_npx${sep}`)) return { root: normalized, version, scope: 'npx' };
    if (globalModuleDirectories().some((directory) => lower.startsWith(directory + sep))) {
        return { root: normalized, version, scope: 'global' };
    }
    const marker = `${sep}node_modules${sep}`;
    const index = normalized.lastIndexOf(marker);
    if (index >= 0) {
        return { root: normalized, version, scope: 'local', ownerProject: normalized.slice(0, index) || sep };
    }
    return { root: normalized, version, scope: 'development' };
}

/**
 * Absolute path of a compiled engine module inside the running installation.
 *
 * @private internal engine identity
 */
export function engineModule(relativeToDist: string): string {
    return join(ENGINE_ROOT, 'dist', relativeToDist);
}
