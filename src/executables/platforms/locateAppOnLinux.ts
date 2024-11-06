import { exec as execLegacy } from 'child_process';
import { promisify } from 'util';
import type { string_executable_path } from '../../types/typeAliases';
import type { LocateAppOptions } from '../locateApp';

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
}: Pick<Required<LocateAppOptions>, 'appName' | 'linuxWhich'>): Promise<string_executable_path | null> {
    try {
        const { stderr, stdout } = await exec(`which ${linuxWhich}`);

        if (!stderr && stdout) {
            return stdout.trim();
        }

        throw new Error(`Can not locate app ${appName} on Linux.\n ${stderr}`);
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
