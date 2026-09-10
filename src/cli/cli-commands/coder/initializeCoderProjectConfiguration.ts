import type { InitializationStatus } from './boilerplateTemplates';
import {
    PROMPTS_DIRECTORY_PATH,
    PROMPTS_DONE_DIRECTORY_PATH,
    PROMPTS_TEMPLATES_DIRECTORY_PATH,
} from './boilerplateTemplates';
import type { EnsuredCoderReferencedArtifact } from './coderReferencedArtifacts';
import { ensureCoderReferencedArtifacts } from './coderReferencedArtifacts';
import { CODER_AGENTS_DIRECTORY_PATH } from './ensureCoderDeveloperAgentFile';
import { ensureCoderEnvFile } from './ensureCoderEnvFile';
import { ensureCoderGitignoreFile } from './ensureCoderGitignoreFile';
import { ensureCoderPackageJsonFile } from './ensureCoderPackageJsonFile';
import { ensureCoderVscodeSettingsFile } from './ensureCoderVscodeSettingsFile';
import { ensureDirectory } from './ensureDirectory';
import { resolveCoderPackageJsonScriptReferencedArtifactPaths } from './getDefaultCoderPackageJsonScripts';

/**
 * Result summary returned after coder configuration initialization.
 *
 * @private internal utility of `coder init` command
 */
export type CoderInitializationSummary = {
    readonly promptsDirectoryStatus: InitializationStatus;
    readonly promptsDoneDirectoryStatus: InitializationStatus;
    readonly promptsTemplatesDirectoryStatus: InitializationStatus;
    readonly agentsDirectoryStatus: InitializationStatus;
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
 * Nothing the project already owns is ever overwritten - existing scripts, settings and files are kept as they are,
 * and the artifacts they would reference are created only together with the scripts which actually reference them.
 *
 * @private internal utility of `coder init` command
 */
export async function initializeCoderProjectConfiguration(projectPath: string): Promise<CoderInitializationSummary> {
    const promptsDirectoryStatus = await ensureDirectory(projectPath, PROMPTS_DIRECTORY_PATH);
    const promptsDoneDirectoryStatus = await ensureDirectory(projectPath, PROMPTS_DONE_DIRECTORY_PATH);
    const promptsTemplatesDirectoryStatus = await ensureDirectory(projectPath, PROMPTS_TEMPLATES_DIRECTORY_PATH);
    const agentsDirectoryStatus = await ensureDirectory(projectPath, CODER_AGENTS_DIRECTORY_PATH);
    const { envFileStatus, initializedEnvVariableNames } = await ensureCoderEnvFile(projectPath);
    const gitignoreFileStatus = await ensureCoderGitignoreFile(projectPath);
    const { status: packageJsonFileStatus, addedEntryKeys: addedPackageJsonScriptNames } =
        await ensureCoderPackageJsonFile(projectPath);
    const vscodeSettingsFileStatus = await ensureCoderVscodeSettingsFile(projectPath);
    const referencedArtifactStatuses = await ensureCoderReferencedArtifacts(
        projectPath,
        resolveCoderPackageJsonScriptReferencedArtifactPaths(addedPackageJsonScriptNames),
    );

    return {
        promptsDirectoryStatus,
        promptsDoneDirectoryStatus,
        promptsTemplatesDirectoryStatus,
        agentsDirectoryStatus,
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
