import { exec as execLegacy } from 'child_process';
import { promisify } from 'util';
import { LocateAppOptions } from '../locateApp';
import { string_executable_path } from '../../types/typeAliases';

// Note: We want to use the `exec` as async function
const exec = promisify(execLegacy);

/**
 * @@@
 *
 * @private within the repository
 */
export async function locateAppOnLinux({
    appName,
    linuxWhich,
}: Pick<Required<LocateAppOptions>, 'appName' | 'linuxWhich'>): Promise<string_executable_path> {
    const { stderr, stdout } = await exec(`which ${linuxWhich}`);

    if (!stderr && stdout) {
        return stdout.trim();
    }

    throw new Error(`Can not locate app ${appName} on Linux.\n ${stderr}`);
}

/**
 * TODO: [🧠][♿] Maybe export through `@promptbook/node`
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
