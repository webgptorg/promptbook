import type { RequireAtLeastOne } from 'type-fest';
import { locateAppOnLinux } from './platforms/locateAppOnLinux';
import { locateAppOnMacOs } from './platforms/locateAppOnMacOs';
import { locateAppOnWindows } from './platforms/locateAppOnWindows';

/**
 * Options for locating any application
 */
export interface LocateAppOptions {
    /**
     * Name of the application
     */
    appName: string;

    /**
     * Name of the executable on Linux
     */
    linuxWhich?: string;

    /**
     * Path suffix on Windows
     */
    windowsSuffix?: string;

    /**
     * Name of the application on macOS
     */
    macOsName?: string;
}

/**
 * Locates an application on the system
 */
export function locateApp(
    options: RequireAtLeastOne<LocateAppOptions, 'linuxWhich' | 'windowsSuffix' | 'macOsName'>,
): Promise<string> {
    const { appName, linuxWhich, windowsSuffix, macOsName } = options;

    if (process.platform === 'win32') {
        if (windowsSuffix) {
            return locateAppOnWindows({ appName, windowsSuffix });
        } else {
            throw new Error(`${appName} is not available on Windows.`);
        }
    } else if (process.platform === 'darwin') {
        if (macOsName) {
            return locateAppOnMacOs({ appName, macOsName });
        } else {
            throw new Error(`${appName} is not available on macOS.`);
        }
    } else {
        if (linuxWhich) {
            return locateAppOnLinux({ appName, linuxWhich });
        } else {
            throw new Error(`${appName} is not available on Linux.`);
        }
    }
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
