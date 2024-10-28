import { join } from 'path';
import { LocateAppOptions } from '../locateApp';
import { isExecutable } from '../utils/isExecutable';

export async function locateAppOnWindows({
    appName,
    windowsSuffix,
}: Pick<Required<LocateAppOptions>, 'appName' | 'windowsSuffix'>): Promise<string> {
    const prefixes = [
        process.env.LOCALAPPDATA,
        join(process.env.LOCALAPPDATA || '', 'Programs'),
        process.env.PROGRAMFILES,
        process.env['PROGRAMFILES(X86)'],
    ];

    for (const prefix of prefixes) {
        const path = prefix + windowsSuffix;

        if (await isExecutable(path)) {
            return path;
        }
    }

    throw new Error(`Can not locate app ${appName} on Windows.`);
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
