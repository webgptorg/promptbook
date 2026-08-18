import { readFile } from 'fs/promises';
import type { AgentMessageTouchedExternalSource } from '../../../src/utils/agent-message-runtime/AgentMessageTouchedExternalSource';
import { resolveAgentMessageTouchedExternalSources } from '../../../src/utils/agent-message-runtime/resolveAgentMessageTouchedExternalSources';
import { resolveAgentMessageTouchedProjectNames } from '../../../src/utils/agent-message-runtime/resolveAgentMessageTouchedProjectNames';
import { listAgentProjectDirectoryNames } from './listAgentProjectDirectoryNames';

/**
 * Everything one answered message worked with, both inside and outside the agent.
 */
export type AnsweredMessageTouches = {
    /**
     * Directory names of the agent projects the answer viewed or edited.
     */
    readonly touchedProjectNames: ReadonlyArray<string>;

    /**
     * Sources outside the agent the answer reached.
     */
    readonly touchedExternalSources: ReadonlyArray<AgentMessageTouchedExternalSource>;
};

/**
 * Resolves which agent projects and which external sources one answered message touched.
 *
 * The runtime log is deleted as soon as the harness run finishes, so this must be called while
 * the log still exists — the Agents Server later shows everything reported here as chips below
 * the answer. Reporting touches is best-effort telemetry: an unreadable log or projects folder
 * simply yields nothing instead of failing the already answered message.
 *
 * @param options - Agent folder path and the live runtime log path of the answered message.
 * @returns Touched projects and external sources, ordered by first appearance in the run.
 */
export async function resolveAnsweredMessageTouches(options: {
    readonly projectPath: string;
    readonly runtimeLogPath: string;
}): Promise<AnsweredMessageTouches> {
    const [logText, knownProjectNames] = await Promise.all([
        readOptionalTextFile(options.runtimeLogPath),
        listAgentProjectDirectoryNames(options.projectPath),
    ]);

    return {
        touchedProjectNames: resolveAgentMessageTouchedProjectNames({ logText, knownProjectNames }),
        touchedExternalSources: resolveAgentMessageTouchedExternalSources({ logText }),
    };
}

/**
 * Reads one text file and treats a missing runtime log as "nothing was recorded".
 *
 * @param filePath - Absolute path of the file to read.
 * @returns File content, or `null` when it cannot be read.
 *
 * @private helper of `resolveAnsweredMessageTouches`
 */
async function readOptionalTextFile(filePath: string): Promise<string | null> {
    try {
        return await readFile(filePath, 'utf-8');
    } catch {
        return null;
    }
}
