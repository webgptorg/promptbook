import { basename } from 'path';
import { resolvePromptbookTemporaryPath } from '../../../../src/utils/filesystem/promptbookTemporaryPath';

/**
 * Options used to build one Promptbook-owned temporary shell script path.
 */
type BuildTemporaryPromptScriptPathOptions = {
    readonly projectPath: string;
    readonly scriptDirectoryName: string;
    readonly sourceFileName: string;
    readonly suffix?: string;
};

/**
 * Builds a normalized temporary shell script path for prompt runners.
 */
export function buildTemporaryPromptScriptPath(options: BuildTemporaryPromptScriptPathOptions): string {
    const sourceFileName = basename(options.sourceFileName);
    const scriptFileName = `${sourceFileName.replace(/\.[^.]+$/u, '')}${options.suffix || ''}.sh`;
    return resolvePromptbookTemporaryPath(options.projectPath, options.scriptDirectoryName, scriptFileName);
}
