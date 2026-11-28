import { $execCommand } from '../../../../utils/execCommand/$execCommand';

/**
 * Time limit for asking npm where it installs global packages.
 */
const NPM_GLOBAL_PREFIX_COMMAND_TIMEOUT_MS = 30 * 1000;

/**
 * Cached lookup, because the global npm prefix cannot change while one command runs and several
 * harnesses are checked at the same time.
 */
let npmGlobalPrefixPathPromise: Promise<string | null> | null = null;

/**
 * Reads the root directory under which npm installs global packages.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it runs npm
 *
 * @returns The global npm prefix or `null` when npm could not be asked for it
 * @private internal utility of `promptbookCli`
 */
export function $resolveNpmGlobalPrefixPath(): Promise<string | null> {
    if (npmGlobalPrefixPathPromise === null) {
        npmGlobalPrefixPathPromise = $readNpmGlobalPrefixPath();
    }

    return npmGlobalPrefixPathPromise;
}

/**
 * Asks npm for the global prefix once.
 */
async function $readNpmGlobalPrefixPath(): Promise<string | null> {
    const output: string = await $execCommand({
        command: 'npm prefix --global --loglevel=error',
        crashOnError: true,
        timeout: NPM_GLOBAL_PREFIX_COMMAND_TIMEOUT_MS,
        isVerbose: false,
    }).catch(() => '');

    // Note: npm prints the prefix as the last line, warnings emitted before it are ignored
    const prefixPath = output
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '')
        .pop();

    return prefixPath ?? null;
}

// Note: [🟡] Code for CLI npm global prefix lookup [$resolveNpmGlobalPrefixPath](src/cli/cli-commands/common/npm/$resolveNpmGlobalPrefixPath.ts) should never be published outside of `@promptbook/cli`
