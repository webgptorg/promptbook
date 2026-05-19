import { buildTemporaryPromptScriptPath } from '../common/runGoScript/buildTemporaryPromptScriptPath';
import type { PromptFile } from './types/PromptFile';
import type { PromptSection } from './types/PromptSection';

/**
 * Temporary subdirectory used for coder prompt runner shell scripts.
 */
const CODER_PROMPT_SCRIPT_DIRECTORY_NAME = 'coder-prompts';

/**
 * Builds the temporary script path for a prompt section.
 */
export function buildScriptPath(file: PromptFile, section: PromptSection, projectPath = process.cwd()): string {
    const suffix = file.sections.length > 1 ? `-${section.index + 1}` : '';
    return buildTemporaryPromptScriptPath({
        projectPath,
        scriptDirectoryName: CODER_PROMPT_SCRIPT_DIRECTORY_NAME,
        sourceFileName: file.name,
        suffix,
    });
}
