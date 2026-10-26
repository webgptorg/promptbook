import { realpathSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { isDirectory, pathExists } from '../common/fs.js';
import { PtbkError } from '../common/errors.js';

/**
 * Name of the versioned project configuration file.
 *
 * @private project workspace
 */
export const CONFIG_FILE_NAME = 'ptbk.json';

/**
 * Name of the Git-ignored runtime directory.
 *
 * @private project workspace
 */
export const RUNTIME_DIRECTORY_NAME = '.ptbk';

/**
 * Locations of project-local runtime storage inside `.ptbk/`.
 *
 * @private project workspace
 */
export type RuntimePaths = {
    /** `.ptbk/` itself. */
    readonly root: string;
    /** Live process record, restart metadata and service logs. */
    readonly service: string;
    /** Recovery records, statistics, schedules and caches. */
    readonly state: string;
    /** Durable human requests. */
    readonly requests: string;
    /** Execution evidence per task attempt. */
    readonly traces: string;
    /** Diagnostics outside tasks. */
    readonly logs: string;
    /** Default isolated browser profile. */
    readonly browserProfile: string;
    /** Short-lived scratch files. */
    readonly temporary: string;
    /** Project ownership lock. */
    readonly lock: string;
};

/**
 * The selected project and its derived paths.
 *
 * @private project workspace
 */
export type Project = {
    /** Absolute project directory. */
    readonly root: string;
    /** Display name (directory name). */
    readonly name: string;
    /** Absolute path of `ptbk.json`. */
    readonly configPath: string;
    /** Runtime storage locations. */
    readonly runtime: RuntimePaths;
};

/**
 * Canonical (real, long-name) form of an existing path; other paths are returned unchanged.
 *
 * Git reports canonical paths, so project roots must use the same form (symlinked temp folders, Windows 8.3 names).
 *
 * @private project workspace
 */
export function canonicalPath(path: string): string {
    try {
        return realpathSync.native(path);
    } catch {
        return path;
    }
}

/**
 * Computes runtime storage paths of a project.
 *
 * @private project workspace
 */
export function runtimePaths(root: string): RuntimePaths {
    const runtime = join(root, RUNTIME_DIRECTORY_NAME);
    return {
        root: runtime,
        service: join(runtime, 'service'),
        state: join(runtime, 'state'),
        requests: join(runtime, 'requests'),
        traces: join(runtime, 'traces'),
        logs: join(runtime, 'logs'),
        browserProfile: join(runtime, 'browser', 'profile'),
        temporary: join(runtime, 'tmp'),
        lock: join(runtime, 'lock.json'),
    };
}

/**
 * Creates the project descriptor for a directory (CLI paths are resolved from the invocation directory).
 *
 * @private project workspace
 */
export function projectAt(path: string, cwd: string = process.cwd()): Project {
    const root = canonicalPath(resolve(cwd, path));
    return { root, name: basename(root) || root, configPath: join(root, CONFIG_FILE_NAME), runtime: runtimePaths(root) };
}

/**
 * Resolves the selected project (`--path` or the current directory) and verifies that it is a directory.
 *
 * @private project workspace
 */
export async function resolveExistingProject(pathOption: string | undefined, cwd: string = process.cwd()): Promise<Project> {
    const project = projectAt(pathOption ?? '.', cwd);
    if (!(await isDirectory(project.root))) {
        throw new PtbkError(`Project directory ${project.root} does not exist.`, {
            kind: 'not-found',
            project: project.root,
            next: [(await pathExists(project.root)) ? 'Select a directory, not a file.' : 'Create it with `ptbk init --path <dir>` or select another `--path`.'],
        });
    }
    return project;
}

