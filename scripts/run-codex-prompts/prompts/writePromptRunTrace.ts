import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { buildPromptRunTraceContent, type BuildPromptRunTraceContentOptions } from './buildPromptRunTraceContent';
import { buildPromptRunTracePath } from './buildPromptRunTracePath';

/**
 * Everything needed to persist the run trace of one prompt round.
 *
 * The runtime log is not passed as text but as the path of the live log the round has been writing into, because
 * the trace is the only place where that log survives - it is deleted as soon as the round is over.
 */
export type WritePromptRunTraceOptions = Omit<BuildPromptRunTraceContentOptions, 'runtimeLog'> & {
    /**
     * Path of the temporary live runtime log of the round, when the round has one.
     */
    readonly logPath?: string;
};

/**
 * Writes the run trace of one prompt round into the `traces` directory of the prompts directory.
 *
 * Returns the path of the written trace so callers can include it in a commit.
 */
export async function writePromptRunTrace(options: WritePromptRunTraceOptions): Promise<string> {
    const { logPath, ...contentOptions } = options;
    const tracePath = buildPromptRunTracePath(options.file, options.section);
    const runtimeLog = await readPromptRuntimeLog(logPath);

    await mkdir(dirname(tracePath), { recursive: true });
    await writeFile(tracePath, buildPromptRunTraceContent({ ...contentOptions, runtimeLog }), 'utf-8');

    return tracePath;
}

/**
 * Reads the live runtime log of one round.
 *
 * A round which never produced a readable log still gets its trace, because the metadata of the round is worth
 * keeping on its own - so a missing log is reported as empty instead of failing the round which has just passed.
 */
async function readPromptRuntimeLog(logPath: string | undefined): Promise<string> {
    if (!logPath) {
        return '';
    }

    try {
        return await readFile(logPath, 'utf-8');
    } catch {
        return '';
    }
}
