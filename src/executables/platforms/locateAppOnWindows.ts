import { delimiter, join } from 'path';
import { assertsError } from '../../errors/assertsError';
import { $provideFilesystemForNode } from '../../scrapers/_common/register/$provideFilesystemForNode';
import type { string_executable_path } from '../../types/string_filename';
import { isExecutable } from '../../utils/files/isExecutable';
import type { LocateAppOptions } from '../locateApp';

/**
 * Attempts to locate the specified application on a Windows system by searching PATH and common installation directories.
 * Returns the path to the executable if found, or null otherwise.
 *
 * @private within the repository
 */
export async function locateAppOnWindows({
    appName,
    windowsSuffix,
}: Pick<Required<LocateAppOptions>, 'appName' | 'windowsSuffix'>): Promise<string_executable_path | null> {
    try {
        const EXECUTABLE_FILENAME = windowsSuffix.replace(/^.*[\\/]/, '');
        const PATH_EXECUTABLE_PATHS = (process.env.PATH || '')
            .split(delimiter)
            .filter(Boolean)
            .map((pathPrefix) => join(pathPrefix, EXECUTABLE_FILENAME));
        const INSTALLATION_EXECUTABLE_PATHS = [
            process.env.LOCALAPPDATA,
            join(process.env.LOCALAPPDATA || '', 'Programs'),
            process.env.PROGRAMFILES,
            process.env['PROGRAMFILES(X86)'],
        ].map((pathPrefix) => pathPrefix + windowsSuffix);

        for (const executablePath of [...PATH_EXECUTABLE_PATHS, ...INSTALLATION_EXECUTABLE_PATHS]) {
            if (await isExecutable(executablePath, $provideFilesystemForNode())) {
                return executablePath;
            }
        }

        throw new Error(`Can not locate app ${appName} on Windows.`);
    } catch (error) {
        assertsError(error);

        return null;
    }
}

// Note: [🟢] Code for Node executable locator [locateAppOnWindows](src/executables/platforms/locateAppOnWindows.ts) should never be published into packages that could be imported into browser environment
// TODO: [🧠][♿] Maybe export through `@promptbook/node`
