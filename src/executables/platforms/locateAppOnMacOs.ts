import { $execCommand } from '../../utils/execCommand/$execCommand';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import type { string_executable_path } from '../../types/typeAliases';
import { isExecutable } from '../../utils/files/isExecutable';
import type { LocateAppOptions } from '../locateApp';

// Note: Module `userhome` has no types available, so it is imported using `require`
//       @see https://stackoverflow.com/questions/37000981/how-to-import-node-module-in-typescript-without-type-definitions
// eslint-disable-next-line @typescript-eslint/no-var-requires
const userhome = require('userhome');

/**
 * @@@
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
        if (!(error instanceof Error)) {
            throw error;
        }

        return null;
    }
}

/**
 * TODO: [🧠][♿] Maybe export through `@promptbook/node`
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
