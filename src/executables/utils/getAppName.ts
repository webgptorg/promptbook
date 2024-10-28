import { capitalize } from '../../_packages/utils.index';

/**
 *
 * @param appPath path to the app executable
 * @returns human-readable app name
 */
export async function getAppName(executablePath: string): Promise<string> {
    // TODO: Get app name from real exif information not the filename

    const match = executablePath.match(/(?<browserName>[^\\\/\.]*)(?:(?:[^\\\/])*)$/i);

    if (match) {
        const appName = match.groups!.browserName!;

        if (appName === 'iexplore') {
            return 'Internet Explorer';
        } else if (appName === 'msedge') {
            return 'Edge';
        } else if (appName === 'google-chrome') {
            return 'Chrome';
        } else {
            return capitalize(appName);
        }
    }

    throw new Error(`Can not get name of "${executablePath}".`);
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
