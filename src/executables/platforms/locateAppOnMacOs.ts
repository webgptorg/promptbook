import { assertsError } from '../../errors/assertsError';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import type { string_executable_path } from '../../types/string_filename';
import { $execCommand } from '../../utils/execCommand/$execCommand';
import { isExecutable } from '../../utils/files/isExecutable';
import type { LocateAppOptions } from '../locateApp';

// Note: Module `userhome` has no types available, so it is imported using `require`
//       @see https://stackoverflow.com/questions/37000981/how-to-import-node-module-in-typescript-without-type-definitions
/**
 * Constant for userhome.
 */
const userhome = require('userhome'); // eslint-disable-line @typescript-eslint/no-var-requires

/**
 * Attempts to locate the specified application on a macOS system by checking standard application paths and using mdfind.
 * Returns the path to the executable if found, or null otherwise.
 *
 * @private within the repository
 */
export async function locateAppOnMacOs({
    macOsName,
}: Pick<Required<LocateAppOptions>, 'macOsName'>): Promise<string_executable_path | null> {
    try {
        const toExec = `/Contents/MacOS/${macOsName}`;
        const regPath = `/Applications/${macOsName}.app` + toExec;
        const altPath = userhome(regPath.slice(1));

        if (await isExecutable(regPath, $provideFilesystemForNode())) {
            return regPath;
        } else if (await isExecutable(altPath, $provideFilesystemForNode())) {
            return altPath;
        }

        const result = await $execCommand({
            crashOnError: true,
            command: `mdfind 'kMDItemDisplayName == "${macOsName}" && kMDItemKind == Application'`,
        });

        return result.trim() + toExec;
    } catch (error) {
        assertsError(error);

        return null;
    }
}

// Note: [🟢] Code for Node executable locator [locateAppOnMacOs](src/executables/platforms/locateAppOnMacOs.ts) should never be published into packages that could be imported into browser environment
// TODO: [🧠][♿] Maybe export through `@promptbook/node`
