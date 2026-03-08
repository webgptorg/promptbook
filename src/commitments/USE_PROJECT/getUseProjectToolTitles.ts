import type { string_javascript_name } from '../../_packages/types.index';
import { UseProjectToolNames } from './UseProjectToolNames';

/**
 * Returns human-readable titles for USE PROJECT tool functions.
 *
 * @private function of UseProjectCommitmentDefinition
 */
export function getUseProjectToolTitles(): Record<string_javascript_name, string> {
    return {
        [UseProjectToolNames.listFiles]: 'List project files',
        [UseProjectToolNames.readFile]: 'Read project file',
        [UseProjectToolNames.upsertFile]: 'Write project file',
        [UseProjectToolNames.deleteFile]: 'Delete project file',
        [UseProjectToolNames.createBranch]: 'Create project branch',
        [UseProjectToolNames.createPullRequest]: 'Create pull request',
    };
}
