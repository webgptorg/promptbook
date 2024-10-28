import { locateApp } from '../locateApp';

export function locateVscode(): Promise<string> {
    return locateApp({
        appName: 'Code',
        linuxWhich: 'code',
        windowsSuffix: '\\Microsoft VS Code\\Code.exe',
        macOsName: 'Code',
    });
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
