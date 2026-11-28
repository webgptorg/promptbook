import { buildTemporaryPromptScriptPath } from '../common/runGoScript/buildTemporaryPromptScriptPath';

/** Names the shared initial check artifact for execution and scoped-commit exclusion. */
export function buildCheckBeforeScriptPath(projectPath: string): string {
    return buildTemporaryPromptScriptPath({
        projectPath,
        scriptDirectoryName: 'coder-prompts',
        sourceFileName: 'check-before',
    });
}
