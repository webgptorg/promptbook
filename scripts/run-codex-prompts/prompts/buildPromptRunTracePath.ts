import { dirname, join } from 'path';
import { buildPromptSectionSuffix } from './buildPromptSectionSuffix';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * Name of the directory which keeps the run traces inside the prompts directory.
 */
const PROMPT_RUN_TRACES_DIRECTORY_NAME = 'traces';

/**
 * Builds the path of the run trace which belongs to one prompt section.
 *
 * The trace is stored in the `traces` directory of the very same prompts directory the prompt itself lives in,
 * and it carries the name of its prompt file. A prompt file holding more than one section appends the section
 * suffix, exactly like the temporary scripts and the isolation worktrees of the same section do.
 */
export function buildPromptRunTracePath(file: PromptFile, section: PromptSection): string {
    const promptFileBaseName = file.name.replace(/\.[^.]+$/u, '');
    const traceFileName = `${promptFileBaseName}${buildPromptSectionSuffix(file, section)}.md`;

    return join(dirname(file.path), PROMPT_RUN_TRACES_DIRECTORY_NAME, traceFileName);
}
