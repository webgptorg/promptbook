import { NotAllowed } from '../../../../errors/NotAllowed';
import { resolvePromptbookTemporaryPath } from '../../../../utils/filesystem/promptbookTemporaryPath';
import { spaceTrim } from '../../../../utils/organization/spaceTrim';
import { assertPlanningRuntimePath } from './assertPlanningRuntimePath';

/**
 * Protects the shared authoring Git helper's temporary directory and shell-quoted absolute message path.
 * PRD paths themselves are checked separately by the write boundary before every save and commit.
 * @private internal execution boundary of `coder plan`
 */
export function assertPlanningCommitSafe(projectPath: string): void {
    if (/[$`%"\r\n]/u.test(projectPath)) {
        throw new NotAllowed(
            spaceTrim(
                'The shared Git helper cannot safely quote this project path. Plan without `--commit` and commit the reviewed PRDs separately.',
            ),
        );
    }
    assertPlanningRuntimePath(
        projectPath,
        resolvePromptbookTemporaryPath(projectPath, 'ptbk-coder', 'commit-messages'),
    );
}
