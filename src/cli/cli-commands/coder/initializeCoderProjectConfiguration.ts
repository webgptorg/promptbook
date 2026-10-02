import { ADAM_AGENT_BOOK_RELATIVE_PATH } from '../common/ensureAdamAgentBook';
import { $resolveConfinedProjectPath } from '../../../utils/filesystem/$resolveConfinedProjectPath';
import { AGENTS_FILE_PATH } from './agentsFile';
import type { InitializationStatus } from './boilerplateTemplates';
import {
    PROMPTS_DIRECTORY_PATH,
    PROMPTS_DONE_DIRECTORY_PATH,
    PROMPTS_TEMPLATES_DIRECTORY_PATH,
    getDefaultCoderProjectPromptTemplateDefinitions,
} from './boilerplateTemplates';
import type { CoderReferencedArtifactStatus, EnsuredCoderReferencedArtifact } from './coderReferencedArtifacts';
import { ensureCoderReferencedArtifacts } from './coderReferencedArtifacts';
import { CODER_DEFAULT_ROLES, ensureCoderDefaultAgentFiles } from './ensureCoderDefaultAgentFiles';
import { CODER_AGENTS_DIRECTORY_PATH } from './ensureCoderDeveloperAgentFile';
import { ensureCoderEnvFile } from './ensureCoderEnvFile';
import { ensureCoderGitignoreFile } from './ensureCoderGitignoreFile';
import { ensureCoderMarkdownFile } from './ensureCoderMarkdownFile';
import { ensureCoderPackageJsonFile } from './ensureCoderPackageJsonFile';
import { ensureCoderVscodeSettingsFile } from './ensureCoderVscodeSettingsFile';
import { ensureDirectory } from './ensureDirectory';
import { resolveCoderPackageJsonScriptReferencedArtifactPaths } from './getDefaultCoderPackageJsonScripts';
import { PROMPTS_README_FILE_PATH, PROMPTS_README_TEMPLATE } from './promptsReadmeTemplate';

/**
 * Result summary returned after coder configuration initialization.
 *
 * @private internal utility of `coder init` command
 */
export type CoderInitializationSummary = {
    readonly promptsDirectoryStatus: InitializationStatus;
    readonly promptsReadmeFileStatus: InitializationStatus;
    readonly promptsDoneDirectoryStatus: InitializationStatus;
    readonly promptsTemplatesDirectoryStatus: InitializationStatus;
    readonly agentsDirectoryStatus: InitializationStatus;
    readonly adamAgentFileStatus: CoderReferencedArtifactStatus;
    readonly adamAgentFileDiagnostic?: string;
    readonly envFileStatus: InitializationStatus;
    readonly gitignoreFileStatus: InitializationStatus;
    readonly packageJsonFileStatus: InitializationStatus;
    readonly vscodeSettingsFileStatus: InitializationStatus;
    readonly addedPackageJsonScriptNames: ReadonlyArray<string>;
    readonly referencedArtifactStatuses: ReadonlyArray<EnsuredCoderReferencedArtifact>;
    readonly initializedEnvVariableNames: ReadonlyArray<string>;
};

/**
 * Creates or updates all coder configuration artifacts required in the current project.
 *
 * Existing scripts, settings and Books are preserved. Missing Books and helper TEAM declarations are added
 * independently of package scripts, with unresolved artifacts reported without replacing project content.
 *
 * @private internal utility of `coder init` command
 */
export async function initializeCoderProjectConfiguration(
    projectPath: string,
    onStepCompleted?: (step: string) => void,
): Promise<CoderInitializationSummary> {
    // Validate every bootstrap target before the first write; customized symlink targets must not escape setup.
    for (const path of [
        PROMPTS_DIRECTORY_PATH,
        PROMPTS_README_FILE_PATH,
        PROMPTS_DONE_DIRECTORY_PATH,
        PROMPTS_TEMPLATES_DIRECTORY_PATH,
        `${CODER_AGENTS_DIRECTORY_PATH}/${ADAM_AGENT_BOOK_RELATIVE_PATH}`,
        ...CODER_DEFAULT_ROLES.map((role) => `${CODER_AGENTS_DIRECTORY_PATH}/${role}.book`),
        ...getDefaultCoderProjectPromptTemplateDefinitions().map((definition) => definition.relativeFilePath),
        AGENTS_FILE_PATH,
        '.env',
        '.gitignore',
        'package.json',
        '.vscode/settings.json',
    ])
        await $resolveConfinedProjectPath(projectPath, path.replace(/\\/gu, '/'));
    /** Records only completed setup steps so callers can explain partial failures. */
    async function completeStep<Result>(step: string, operation: Promise<Result>): Promise<Result> {
        const result = await operation;
        onStepCompleted?.(step);
        return result;
    }
    const promptsDirectoryStatus = await completeStep('prompts/', ensureDirectory(projectPath, PROMPTS_DIRECTORY_PATH));
    const promptsReadmeFileStatus = await completeStep(
        'prompts/README.md',
        ensureCoderMarkdownFile(projectPath, PROMPTS_README_FILE_PATH, PROMPTS_README_TEMPLATE),
    );
    const promptsDoneDirectoryStatus = await completeStep(
        'prompts/done/',
        ensureDirectory(projectPath, PROMPTS_DONE_DIRECTORY_PATH),
    );
    const promptsTemplatesDirectoryStatus = await completeStep(
        'prompts/templates/',
        ensureDirectory(projectPath, PROMPTS_TEMPLATES_DIRECTORY_PATH),
    );
    const agentsDirectoryStatus = await completeStep(
        'agents/',
        ensureDirectory(projectPath, CODER_AGENTS_DIRECTORY_PATH),
    );
    const defaultAgentArtifacts = await completeStep(
        'Default Books and TEAM references checked',
        ensureCoderDefaultAgentFiles(projectPath),
    );
    const adamRelativeFilePath = `${CODER_AGENTS_DIRECTORY_PATH}/${ADAM_AGENT_BOOK_RELATIVE_PATH}`;
    const adamArtifact = defaultAgentArtifacts.find(
        ({ relativeFilePath }) => relativeFilePath === adamRelativeFilePath,
    )!;
    const { envFileStatus, initializedEnvVariableNames } = await completeStep('.env', ensureCoderEnvFile(projectPath));
    const gitignoreFileStatus = await completeStep('.gitignore', ensureCoderGitignoreFile(projectPath));
    const { status: packageJsonFileStatus, addedEntryKeys: addedPackageJsonScriptNames } = await completeStep(
        'package.json',
        ensureCoderPackageJsonFile(projectPath),
    );
    const vscodeSettingsFileStatus = await completeStep(
        '.vscode/settings.json',
        ensureCoderVscodeSettingsFile(projectPath),
    );
    const referencedArtifactStatuses = [
        ...defaultAgentArtifacts.filter(({ relativeFilePath }) => relativeFilePath !== adamRelativeFilePath),
        ...(await completeStep(
            'Script-referenced artifacts checked',
            ensureCoderReferencedArtifacts(
                projectPath,
                resolveCoderPackageJsonScriptReferencedArtifactPaths(addedPackageJsonScriptNames),
            ),
        )),
    ];

    return {
        promptsDirectoryStatus,
        promptsReadmeFileStatus,
        promptsDoneDirectoryStatus,
        promptsTemplatesDirectoryStatus,
        agentsDirectoryStatus,
        adamAgentFileStatus: adamArtifact.status,
        adamAgentFileDiagnostic: adamArtifact.diagnostic,
        envFileStatus,
        gitignoreFileStatus,
        packageJsonFileStatus,
        vscodeSettingsFileStatus,
        addedPackageJsonScriptNames,
        referencedArtifactStatuses,
        initializedEnvVariableNames,
    };
}

// Note: [🟡] Code for coder init project bootstrapping [initializeCoderProjectConfiguration](src/cli/cli-commands/coder/initializeCoderProjectConfiguration.ts) should never be published outside of `@promptbook/cli`
