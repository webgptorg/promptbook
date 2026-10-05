import { ensureProjectTextFile } from '../common/ensureProjectTextFile';
import type { InitializationStatus } from './boilerplateTemplates';

/**
 * Ensures one coder markdown file exists with the provided default boilerplate.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function ensureCoderMarkdownFile(
    projectPath: string,
    relativeFilePath: string,
    fileContent: string,
): Promise<InitializationStatus> {
    return ensureProjectTextFile(projectPath, relativeFilePath, fileContent);
}

// Note: [🟡] Code for coder init markdown bootstrapping [ensureCoderMarkdownFile](src/cli/cli-commands/coder/ensureCoderMarkdownFile.ts) should never be published outside of `@promptbook/cli`
