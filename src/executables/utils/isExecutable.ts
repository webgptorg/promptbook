import { constants } from 'fs';
import { access } from 'fs/promises';

export async function isExecutable(path: string) {
    try {
        await access(path, constants.X_OK);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
