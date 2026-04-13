import { writeFile } from 'fs/promises';
import moment from 'moment';
import { extname } from 'path';
import { formatUnknownErrorDetails } from '../common/formatUnknownErrorDetails';
import { buildPromptLabelForDisplay } from './buildPromptLabelForDisplay';
import { buildPromptSummary } from './buildPromptSummary';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * Options for write prompt error log.
 */
type WritePromptErrorLogOptions = {
    file: PromptFile;
    section: PromptSection;
    runnerName?: string;
    modelName?: string;
    error: unknown;
};

/**
 * Writes the failure details for a single prompt run next to the prompt markdown file.
 */
export async function writePromptErrorLog(options: WritePromptErrorLogOptions): Promise<void> {
    const logPath = buildPromptErrorLogPath(options.file.path);
    const label = buildPromptLabelForDisplay(options.file, options.section);
    const summary = buildPromptSummary(options.file, options.section);
    const details = formatUnknownErrorDetails(options.error);

    const modelSuffix = options.modelName ? ` (${options.modelName})` : '';
    const runnerLabel = `${options.runnerName || 'unknown'}${modelSuffix}`;

    const log = [
        `Timestamp: ${moment().toISOString()}`,
        `Prompt: ${label}`,
        `Prompt file: ${options.file.path}`,
        `Prompt section: ${options.section.index + 1}`,
        `Prompt summary: ${summary}`,
        `Runner: ${runnerLabel}`,
        '',
        'CLI output and error:',
        details,
        '',
    ].join('\n');

    await writeFile(logPath, log, 'utf-8');
}

/**
 * Returns the failure log path for a prompt markdown file.
 */
function buildPromptErrorLogPath(promptPath: string): string {
    const extension = extname(promptPath);

    if (extension.toLowerCase() === '.md') {
        return `${promptPath.slice(0, -extension.length)}.error.log`;
    }

    return `${promptPath}.error.log`;
}
