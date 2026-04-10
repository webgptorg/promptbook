import { AGENT_CODING_FILE_PATH, getDefaultCoderAgentCodingFileContent } from './agentCodingFile';
import { AGENTS_FILE_PATH, getDefaultCoderAgentsFileContent } from './agentsFile';
import {
    ensureDefaultCoderPromptTemplateFiles,
    type EnsuredCoderPromptTemplateFile,
    type InitializationStatus,
    PROMPTS_DIRECTORY_PATH,
    PROMPTS_DONE_DIRECTORY_PATH,
    PROMPTS_TEMPLATES_DIRECTORY_PATH,
} from './boilerplateTemplates';
import { ensureCoderEnvFile } from './ensureCoderEnvFile';
import { ensureCoderGitignoreFile } from './ensureCoderGitignoreFile';
import { ensureCoderMarkdownFile } from './ensureCoderMarkdownFile';
import { ensureCoderPackageJsonFile } from './ensureCoderPackageJsonFile';
import { ensureCoderVscodeSettingsFile } from './ensureCoderVscodeSettingsFile';
import { ensureDirectory } from './ensureDirectory';
import { getDefaultCoderPackageJsonScripts } from './getDefaultCoderPackageJsonScripts';

/**
 * Result summary returned after coder configuration initialization.
 *
 * @private internal utility of `coder init` command
 */
export type CoderInitializationSummary = {
    readonly promptsDirectoryStatus: InitializationStatus;
    readonly promptsDoneDirectoryStatus: InitializationStatus;
    readonly promptsTemplatesDirectoryStatus: InitializationStatus;
    readonly promptTemplateFileStatuses: ReadonlyArray<EnsuredCoderPromptTemplateFile>;
    readonly agentsFileStatus: InitializationStatus;
    readonly agentCodingFileStatus: InitializationStatus;
    readonly envFileStatus: InitializationStatus;
    readonly gitignoreFileStatus: InitializationStatus;
    readonly packageJsonFileStatus: InitializationStatus;
    readonly vscodeSettingsFileStatus: InitializationStatus;
    readonly initializedEnvVariableNames: ReadonlyArray<string>;
};

/**
 * Creates or updates all coder configuration artifacts required in the current project.
 *
 * @private internal utility of `coder init` command
 */
export async function initializeCoderProjectConfiguration(projectPath: string): Promise<CoderInitializationSummary> {
    const promptsDirectoryStatus = await ensureDirectory(projectPath, PROMPTS_DIRECTORY_PATH);
    const promptsDoneDirectoryStatus = await ensureDirectory(projectPath, PROMPTS_DONE_DIRECTORY_PATH);
    const promptsTemplatesDirectoryStatus = await ensureDirectory(projectPath, PROMPTS_TEMPLATES_DIRECTORY_PATH);
    const promptTemplateFileStatuses = await ensureDefaultCoderPromptTemplateFiles(projectPath);
    const agentsFileStatus = await ensureCoderMarkdownFile(projectPath, AGENTS_FILE_PATH, getDefaultCoderAgentsFileContent());
    const agentCodingFileStatus = await ensureCoderMarkdownFile(
        projectPath,
        AGENT_CODING_FILE_PATH,
        getDefaultCoderAgentCodingFileContent({
            packageJsonScripts: getDefaultCoderPackageJsonScripts(),
        }),
    );
    const { envFileStatus, initializedEnvVariableNames } = await ensureCoderEnvFile(projectPath);
    const gitignoreFileStatus = await ensureCoderGitignoreFile(projectPath);
    const packageJsonFileStatus = await ensureCoderPackageJsonFile(projectPath);
    const vscodeSettingsFileStatus = await ensureCoderVscodeSettingsFile(projectPath);

    return {
        promptsDirectoryStatus,
        promptsDoneDirectoryStatus,
        promptsTemplatesDirectoryStatus,
        promptTemplateFileStatuses,
        agentsFileStatus,
        agentCodingFileStatus,
        envFileStatus,
        gitignoreFileStatus,
        packageJsonFileStatus,
        vscodeSettingsFileStatus,
        initializedEnvVariableNames,
    };
}

// Note: [🟡] Code for coder init project bootstrapping [initializeCoderProjectConfiguration](src/cli/cli-commands/coder/initializeCoderProjectConfiguration.ts) should never be published outside of `@promptbook/cli`
