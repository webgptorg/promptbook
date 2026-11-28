import { join, relative } from 'path';
import type { WorkspaceRepositoryContext } from '../common/workspaceRepository';
import { ADAM_AGENT_BOOK_RELATIVE_PATH } from '../common/ensureAdamAgentBook';
import type { CoderReferencedArtifactStatus } from './coderReferencedArtifacts';
import { CODER_AGENTS_DIRECTORY_PATH } from './ensureCoderDeveloperAgentFile';
import { CODER_GITATTRIBUTES_FILE_PATH } from './ensureCoderGitattributesFile';
import type { CoderInitializationSummary } from './initializeCoderProjectConfiguration';

/**
 * Restricts an explicit initialization commit to the initializer's write set, in repository-relative paths.
 * The shared snapshot still excludes pre-existing files that initialization did not actually change.
 *
 * @private internal utility of the shared project initializer
 */
export function getCoderInitializationCommitPaths(
    workspace: WorkspaceRepositoryContext,
    summary: CoderInitializationSummary,
    boilerplatePaths: ReadonlyArray<string>,
): ReadonlyArray<string> {
    const artifacts: ReadonlyArray<{
        readonly relativeFilePath: string;
        readonly status: CoderReferencedArtifactStatus;
    }> = [
        { relativeFilePath: 'prompts/README.md', status: summary.promptsReadmeFileStatus },
        {
            relativeFilePath: `${CODER_AGENTS_DIRECTORY_PATH}/${ADAM_AGENT_BOOK_RELATIVE_PATH}`,
            status: summary.adamAgentFileStatus,
        },
        { relativeFilePath: '.env', status: summary.envFileStatus },
        { relativeFilePath: '.gitignore', status: summary.gitignoreFileStatus },
        { relativeFilePath: CODER_GITATTRIBUTES_FILE_PATH, status: summary.gitattributesFileStatus },
        { relativeFilePath: 'package.json', status: summary.packageJsonFileStatus },
        { relativeFilePath: '.vscode/settings.json', status: summary.vscodeSettingsFileStatus },
        ...summary.referencedArtifactStatuses,
    ];
    return [
        ...artifacts
            .filter(({ status }) => status === 'created' || status === 'updated' || status === 'augmented')
            .map(({ relativeFilePath }) => relativeFilePath),
        ...boilerplatePaths,
    ].map((path) => relative(workspace.repositoryRoot!, join(workspace.projectPath, path)).replace(/\\/gu, '/'));
}

// Note: [🟡] Code for initialization commit paths [getCoderInitializationCommitPaths](src/cli/cli-commands/coder/getCoderInitializationCommitPaths.ts) should never be published outside of `@promptbook/cli`
