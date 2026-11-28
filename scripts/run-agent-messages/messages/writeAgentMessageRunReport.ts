import colors from 'colors';
import { writeFile } from 'fs/promises';
import {
    buildAgentMessageRunReportPath,
    serializeAgentMessageRunReport,
    type AgentMessageRunReport,
} from '../../../src/book-3.0/AgentMessageRunReport';

/**
 * Result of persisting one run report next to an answered message book.
 */
export type WrittenAgentMessageRunReport = {
    readonly absolutePath: string;
    readonly relativePath: string;
};

/**
 * Writes the run report sidecar next to one answered message book.
 *
 * The report is best-effort telemetry — the answer itself is already persisted in the
 * finished message book, so a failed report write only logs a warning instead of
 * failing the whole answered message.
 *
 * @returns The written report paths, or `null` when the write failed.
 */
export async function writeAgentMessageRunReport(options: {
    readonly finishedMessageAbsolutePath: string;
    readonly finishedMessageRelativePath: string;
    readonly report: AgentMessageRunReport;
}): Promise<WrittenAgentMessageRunReport | null> {
    const absolutePath = buildAgentMessageRunReportPath(options.finishedMessageAbsolutePath);
    const relativePath = buildAgentMessageRunReportPath(options.finishedMessageRelativePath);

    try {
        await writeFile(absolutePath, serializeAgentMessageRunReport(options.report), 'utf-8');
        return { absolutePath, relativePath };
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        console.warn(colors.yellow(`Failed to write agent message run report ${relativePath}: ${details}`));
        return null;
    }
}
