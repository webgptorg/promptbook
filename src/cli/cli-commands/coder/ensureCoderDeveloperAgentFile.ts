import type { InitializationStatus } from './boilerplateTemplates';
import { ensureCoderRoleAgentFile } from './ensureCoderRoleAgentFile';

/**
 * Relative directory path for agents initialized by `ptbk coder init`.
 *
 * @private internal utility of `coder init` command
 */
export const CODER_AGENTS_DIRECTORY_PATH = 'agents';

/**
 * Relative file path to the default developer agent initialized by `ptbk coder init`.
 *
 * @private internal utility of `coder init` command
 */
export const CODER_DEVELOPER_AGENT_FILE_PATH = 'agents/developer.book';

/**
 * Source file path of the bundled developer agent inside the Promptbook repository.
 *
 * @private internal utility of `coder init` command
 */
export const DEFAULT_CODER_DEVELOPER_AGENT_SOURCE_FILE_PATH = 'agents/default/developer.book';

/**
 * Ensures the default developer agent exists in the initialized project.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function ensureCoderDeveloperAgentFile(projectPath: string): Promise<InitializationStatus> {
    return ensureCoderRoleAgentFile(projectPath, 'developer');
}

// Note: [🟡] Code for coder init developer agent bootstrapping [ensureCoderDeveloperAgentFile](src/cli/cli-commands/coder/ensureCoderDeveloperAgentFile.ts) should never be published outside of `@promptbook/cli`
