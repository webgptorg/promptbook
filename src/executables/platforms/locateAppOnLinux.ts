import { exec as execLegacy } from 'child_process';
import { promisify } from 'util';
import { LocateAppOptions } from '../locateApp';

const exec = promisify(execLegacy);

export async function locateAppOnLinux({
    appName,
    linuxWhich,
}: Pick<Required<LocateAppOptions>, 'appName' | 'linuxWhich'>): Promise<string> {
    const { stderr, stdout } = await exec(`which ${linuxWhich}`);

    if (!stderr && stdout) {
        return stdout.trim();
    }

    throw new Error(`Can not locate app ${appName} on Linux.\n ${stderr}`);
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
