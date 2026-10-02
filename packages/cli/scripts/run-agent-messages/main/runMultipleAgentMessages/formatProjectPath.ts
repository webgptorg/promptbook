import { relative } from 'path';

/**
 * Formats one child project path for stable console and UI output.
 *
 * @private function of `runMultipleAgentMessages`
 */
export function formatProjectPath(rootPath: string, projectPath: string): string {
    return relative(rootPath, projectPath).replace(/\\/gu, '/');
}
