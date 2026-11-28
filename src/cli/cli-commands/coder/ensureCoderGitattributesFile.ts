import { ensureProjectTextFile } from '../common/ensureProjectTextFile';
import type { InitializationStatus } from './boilerplateTemplates';

/**
 * Project-relative path to the Git attributes initialized by Promptbook Coder.
 *
 * @private internal constant of `coder init`
 */
export const CODER_GITATTRIBUTES_FILE_PATH = '.gitattributes';

/**
 * Default Git attributes for automatic text detection and consistent LF line endings.
 */
const DEFAULT_CODER_GITATTRIBUTES_CONTENT = '* text=auto eol=lf';

/**
 * Creates default Git attributes when missing, preserving project-owned attributes.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function ensureCoderGitattributesFile(projectPath: string): Promise<InitializationStatus> {
    return ensureProjectTextFile(projectPath, CODER_GITATTRIBUTES_FILE_PATH, DEFAULT_CODER_GITATTRIBUTES_CONTENT);
}

// Note: [🟡] Code for coder init Git attributes bootstrapping [ensureCoderGitattributesFile](src/cli/cli-commands/coder/ensureCoderGitattributesFile.ts) should never be published outside of `@promptbook/cli`
