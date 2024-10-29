import { exec as execLegacy } from 'child_process';
import { promisify } from 'util';
import { $provideFilesystemForNode } from '../../_packages/node.index';
import { string_executable_path } from '../../types/typeAliases';
import { isExecutable } from '../../utils/files/isExecutable';
import { LocateAppOptions } from '../locateApp';

// Note: Module `userhome` has no types available, so it is imported using `require`
//       @see https://stackoverflow.com/questions/37000981/how-to-import-node-module-in-typescript-without-type-definitions
// eslint-disable-next-line @typescript-eslint/no-var-requires
const userhome = require('userhome');

// Note: We want to use the `exec` as async function
const exec = promisify(execLegacy);

/**
 * @@@
 *
 * @private within the repository
 */
export async function locateAppOnMacOs({
    appName,
    macOsName,
}: Pick<Required<LocateAppOptions>, 'appName' | 'macOsName'>): Promise<string_executable_path> {
    const toExec = `/Contents/MacOS/${macOsName}`;
    const regPath = `/Applications/${macOsName}.app` + toExec;
    const altPath = userhome(regPath.slice(1));

    if (await isExecutable(regPath, $provideFilesystemForNode())) {
        return regPath;
    } else if (await isExecutable(altPath, $provideFilesystemForNode())) {
        return altPath;
    }

    const { stderr, stdout } = await exec(
        `mdfind 'kMDItemDisplayName == "${macOsName}" && kMDItemKind == Application'`,
    );

    if (!stderr && stdout) {
        return stdout.trim() + toExec;
    }

    throw new Error(`Can not locate app ${appName} on macOS.\n ${stderr}`);
}

/**
 * TODO: [🧠][♿] Maybe export through `@promptbook/node`
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
