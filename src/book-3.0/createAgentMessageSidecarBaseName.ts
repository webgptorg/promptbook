import { basename } from 'path';

/**
 * Creates the stable file-system safe base name that belongs to one queued `.book` message.
 *
 * Every sidecar the Agents Server prepares next to a queued message (TEAM workspaces, planned-message
 * files, ...) derives its own name from this one normalization, so a sidecar can always be found again
 * from the message file name alone.
 *
 * @param messageFileName - File name of the queued message, with or without directories.
 * @returns Normalized base name usable as a directory or file name.
 *
 * @private internal convention shared by the Agents Server and agent-folder runner
 */
export function createAgentMessageSidecarBaseName(messageFileName: string): string {
    const rawBaseName = basename(messageFileName).replace(/\.book$/iu, '');
    const normalizedBaseName = rawBaseName.replace(/[^A-Za-z0-9._-]+/gu, '-').replace(/^[._-]+|[._-]+$/gu, '');

    return normalizedBaseName || 'message';
}
