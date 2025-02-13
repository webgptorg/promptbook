import { join } from 'path';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import type { string_executable_path } from '../../types/typeAliases';
import { isExecutable } from '../../utils/files/isExecutable';
import type { LocateAppOptions } from '../locateApp';

/**
 * @@@
 *
 * @private within the repository
 */
export async function locateAppOnWindows({
    appName,
    windowsSuffix,
}: Pick<Required<LocateAppOptions>, 'appName' | 'windowsSuffix'>): Promise<string_executable_path | null> {
    try {
        const prefixes = [
            process.env.LOCALAPPDATA,
            join(process.env.LOCALAPPDATA || '', 'Programs'),
            process.env.PROGRAMFILES,
            process.env['PROGRAMFILES(X86)'],
        ];

        for (const prefix of prefixes) {
            const path = prefix + windowsSuffix;

            if (await isExecutable(path, $provideFilesystemForNode())) {
                return path;
            }
        }

        throw new Error(`Can not locate app ${appName} on Windows.`);
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
