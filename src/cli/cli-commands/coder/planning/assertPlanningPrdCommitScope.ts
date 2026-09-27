import { execFile } from 'child_process';
// cspell:ignore fsmonitor pathspecs
import { promisify } from 'util';
import { NotAllowed } from '../../../../errors/NotAllowed';
import { spaceTrim } from '../../../../utils/organization/spaceTrim';
import type { PlanningChange } from './preparePlanningChanges';

/**
 * Refuses to mix prior or concurrent user edits into a PRD that this session intends to commit.
 * After the first save, the session's exact saved text is the baseline for subsequent revisions.
 * @private internal execution boundary of `coder plan`
 */
export async function assertPlanningPrdCommitScope(
    projectPath: string,
    changes: ReadonlyArray<PlanningChange>,
    savedContents: ReadonlyMap<string, string>,
    preexistingChangedPaths: ReadonlySet<string>,
): Promise<void> {
    for (const change of changes) {
        if (preexistingChangedPaths.has(change.path)) {
            throw new NotAllowed(
                spaceTrim(
                    `\`${change.path}\` already had user changes before this --commit session. Restart without --commit to revise it without committing those changes.`,
                ),
            );
        }
        if (change.before === null) continue;
        let isChangedOutsideSession: boolean;
        if (savedContents.has(change.path)) {
            isChangedOutsideSession = savedContents.get(change.path) !== change.before;
        } else {
            const { stdout } = await promisify(execFile)(
                'git',
                [
                    '--no-optional-locks',
                    '--literal-pathspecs',
                    '-c',
                    'core.fsmonitor=false',
                    'status',
                    '--porcelain',
                    '--untracked-files=all',
                    '--',
                    change.path,
                ],
                { cwd: projectPath, windowsHide: true, timeout: 10000, maxBuffer: 65536 },
            );
            isChangedOutsideSession = stdout.trim() !== '';
        }
        if (isChangedOutsideSession) {
            throw new NotAllowed(
                spaceTrim(
                    `\`${change.path}\` has concurrent user changes outside this planning session. Restart without --commit to revise it without committing those changes.`,
                ),
            );
        }
    }
}
