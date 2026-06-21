import { copyFile, stat } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../errors/NotAllowed';
import type { InitializationStatus } from './boilerplateTemplates';

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
    const absoluteFilePath = join(projectPath, CODER_DEVELOPER_AGENT_FILE_PATH);
    if (await isExistingFile(absoluteFilePath)) {
        return 'unchanged';
    }

    await copyFile(await resolveDefaultCoderDeveloperAgentFilePath(), absoluteFilePath);
    return 'created';
}

/**
 * Resolves the bundled developer agent from a source checkout or generated CLI package.
 */
async function resolveDefaultCoderDeveloperAgentFilePath(): Promise<string> {
    const candidates = [
        join(__dirname, '..', DEFAULT_CODER_DEVELOPER_AGENT_SOURCE_FILE_PATH),
        join(__dirname, '..', '..', '..', '..', DEFAULT_CODER_DEVELOPER_AGENT_SOURCE_FILE_PATH),
    ];

    for (const candidate of candidates) {
        if (await isExistingFile(candidate)) {
            return candidate;
        }
    }

    throw new NotAllowed(
        spaceTrim(`
            Cannot find the bundled Promptbook developer agent.

            Checked:
            ${candidates.map((candidate) => `- \`${candidate}\``).join('\n')}
        `),
    );
}

/**
 * Checks whether a path exists and is a file.
 */
async function isExistingFile(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isFile();
    } catch {
        return false;
    }
}

// Note: [🟡] Code for coder init developer agent bootstrapping [ensureCoderDeveloperAgentFile](src/cli/cli-commands/coder/ensureCoderDeveloperAgentFile.ts) should never be published outside of `@promptbook/cli`
