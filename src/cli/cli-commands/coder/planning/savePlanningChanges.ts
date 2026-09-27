import {
    closeSync,
    existsSync,
    fsyncSync,
    linkSync,
    openSync,
    readFileSync,
    renameSync,
    unlinkSync,
    writeFileSync,
} from 'fs';
import { join, relative } from 'path';
import { NotAllowed } from '../../../../errors/NotAllowed';
import { spaceTrim } from '../../../../utils/organization/spaceTrim';
import { assertPlanningRuntimePath } from './assertPlanningRuntimePath';
import { resolvePlanningPath } from './resolvePlanningPath';
import type { PlanningChange } from './preparePlanningChanges';

/**
 * Validates the entire batch before writing, stages outside the queue, then atomically replaces each file.
 * The synchronous commit region cannot be interrupted by a SIGINT callback halfway through a save.
 * @private internal execution boundary of `coder plan`
 */
export function savePlanningChanges(
    projectPath: string,
    workspacePath: string,
    changes: ReadonlyArray<PlanningChange>,
    isDraft: boolean,
): string[] {
    assertPlanningRuntimePath(projectPath, workspacePath);
    const prepared = changes.map((change, index) => {
        const path = resolvePlanningPath(projectPath, change.path, true);
        const current = existsSync(path) ? readFileSync(path, 'utf-8') : null;
        if (current !== change.before) {
            throw new NotAllowed(
                spaceTrim(
                    `\`${change.path}\` changed since the preview. Nothing was saved; ask Planner to read it again.`,
                ),
            );
        }
        if (isDraft && !change.draft) {
            throw new NotAllowed(
                spaceTrim(
                    `\`${change.path}\` has routing metadata that cannot be converted to [-] safely. Save the reviewed ready revision or keep discussing it.`,
                ),
            );
        }
        return {
            ...change,
            path,
            content: isDraft ? change.draft : change.after,
            temporaryPath: join(workspacePath, `save-${index}.tmp`),
        };
    });
    const saved: typeof prepared = [];
    try {
        for (const change of prepared) {
            writeDurableFile(change.temporaryPath, change.content);
        }
        for (const change of prepared) {
            resolvePlanningPath(projectPath, relative(projectPath, change.path), true);
            const current = existsSync(change.path) ? readFileSync(change.path, 'utf-8') : null;
            if (current !== change.before) {
                throw new NotAllowed(
                    spaceTrim(
                        `\`${relative(projectPath, change.path)}\` changed while saving. Review a fresh preview.`,
                    ),
                );
            }
            if (change.before === null) {
                // Hard-link creation is exclusive: unlike rename, it cannot overwrite a concurrently created task.
                linkSync(change.temporaryPath, change.path);
                saved.push(change);
                unlinkSync(change.temporaryPath);
            } else {
                renameSync(change.temporaryPath, change.path);
                saved.push(change);
            }
        }
    } catch (error) {
        for (const change of saved.reverse()) {
            if (change.before === null) unlinkSync(change.path);
            else {
                writeDurableFile(change.temporaryPath, change.before);
                renameSync(change.temporaryPath, change.path);
            }
        }
        throw error;
    } finally {
        for (const change of prepared) {
            if (existsSync(change.temporaryPath)) unlinkSync(change.temporaryPath);
        }
    }
    return changes.map((change) => change.path);
}

/** Flushes a staged PRD before publishing its directory entry. */
function writeDurableFile(path: string, content: string): void {
    const descriptor = openSync(path, 'wx');
    try {
        writeFileSync(descriptor, content, 'utf-8');
        fsyncSync(descriptor);
    } finally {
        closeSync(descriptor);
    }
}
