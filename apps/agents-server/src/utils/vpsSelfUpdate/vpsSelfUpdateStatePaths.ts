import { dirname, resolve } from 'path';
import { resolveVpsEnvironmentFilePath } from '../vpsConfiguration';

/**
 * Resolves the state-directory path used for persistent update logs and status files.
 *
 * @returns Absolute directory path.
 */
function resolveVpsSelfUpdateStateDirectory(): string {
    return resolve(dirname(resolveVpsEnvironmentFilePath()), '.promptbook', 'self-update');
}

/**
 * Resolves the filesystem path of the persisted self-update log file.
 *
 * @returns Absolute log-file path.
 */
export function resolveVpsSelfUpdateLogFilePath(): string {
    return resolve(resolveVpsSelfUpdateStateDirectory(), 'self-update.log');
}

/**
 * Resolves the filesystem path of the persisted self-update status file.
 *
 * @returns Absolute status-file path.
 */
export function resolveVpsSelfUpdateStatusFilePath(): string {
    return resolve(resolveVpsSelfUpdateStateDirectory(), 'self-update.status');
}
