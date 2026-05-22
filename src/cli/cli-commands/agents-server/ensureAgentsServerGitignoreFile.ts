import { PROMPTBOOK_TEMPORARY_DIRECTORY } from '../../../utils/filesystem/promptbookTemporaryPath';
import { ensureProjectGitignoreFile, type ProjectInitializationStatus } from '../common/projectInitialization';

/**
 * Gitignore header for rules initialized by the Agents Server command.
 */
const AGENTS_SERVER_GITIGNORE_HEADER = '# Promptbook Agents Server';

/**
 * Node dependency directory that the local Agents Server project should not track.
 */
const AGENTS_SERVER_NODE_MODULES_GITIGNORE_RULE = 'node_modules';

/**
 * Hidden Agents Server log directory that the local runtime should not track.
 */
const AGENTS_SERVER_LOGS_GITIGNORE_RULE = '.logs';

/**
 * Rules needed for locally initialized Agents Server runtime artifacts.
 */
const AGENTS_SERVER_GITIGNORE_RULES = [
    AGENTS_SERVER_NODE_MODULES_GITIGNORE_RULE,
    PROMPTBOOK_TEMPORARY_DIRECTORY,
    AGENTS_SERVER_LOGS_GITIGNORE_RULE,
] as const;

/**
 * Ensures `.gitignore` excludes local Agents Server runtime artifacts.
 *
 * @private internal utility of `ptbk agents-server init`
 */
export async function ensureAgentsServerGitignoreFile(projectPath: string): Promise<ProjectInitializationStatus> {
    return ensureProjectGitignoreFile({
        projectPath,
        blockHeader: AGENTS_SERVER_GITIGNORE_HEADER,
        rules: AGENTS_SERVER_GITIGNORE_RULES,
    });
}

// Note: [🟡] Code for Agents Server gitignore bootstrapping [ensureAgentsServerGitignoreFile](src/cli/cli-commands/agents-server/ensureAgentsServerGitignoreFile.ts) should never be published outside of `@promptbook/cli`
