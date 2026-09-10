import { AGENTS_FILE_PATH, getDefaultCoderAgentsFileContent } from './agentsFile';
import type { CoderPromptTemplateDefinition, InitializationStatus } from './boilerplateTemplates';
import {
    ensureDefaultCoderPromptTemplateFile,
    getDefaultCoderProjectPromptTemplateDefinitions,
} from './boilerplateTemplates';
import { CODER_DEVELOPER_AGENT_FILE_PATH, ensureCoderDeveloperAgentFile } from './ensureCoderDeveloperAgentFile';
import { ensureCoderMarkdownFile } from './ensureCoderMarkdownFile';

/**
 * Status of one artifact referenced by the default coder scripts.
 *
 * `not-referenced` means that no newly added script points at the artifact, so `ptbk coder init` left it alone.
 *
 * @private internal utility of `coder init` command
 */
export type CoderReferencedArtifactStatus = InitializationStatus | 'not-referenced';

/**
 * Result of ensuring one artifact referenced by the default coder scripts.
 *
 * @private internal utility of `coder init` command
 */
export type EnsuredCoderReferencedArtifact = {
    /**
     * Project-relative path of the referenced artifact.
     */
    readonly relativeFilePath: string;

    /**
     * Status describing whether the artifact had to be created.
     */
    readonly status: CoderReferencedArtifactStatus;
};

/**
 * One project artifact which the default coder scripts point at.
 */
type CoderReferencedArtifactDefinition = {
    /**
     * Project-relative path which both identifies the artifact and locates it inside the project.
     */
    readonly relativeFilePath: string;

    /**
     * Creates the artifact when it is missing, never overwriting an existing one.
     */
    readonly ensureArtifactFile: (projectPath: string) => Promise<InitializationStatus>;
};

/**
 * Creates the artifact definition of one project-owned coder prompt template.
 */
function createCoderPromptTemplateArtifactDefinition(
    definition: CoderPromptTemplateDefinition,
): CoderReferencedArtifactDefinition {
    return {
        relativeFilePath: definition.relativeFilePath,
        ensureArtifactFile: (projectPath) => ensureDefaultCoderPromptTemplateFile(projectPath, definition),
    };
}

/**
 * Every artifact which the default coder scripts can reference.
 */
const CODER_REFERENCED_ARTIFACT_DEFINITIONS: ReadonlyArray<CoderReferencedArtifactDefinition> = [
    {
        relativeFilePath: CODER_DEVELOPER_AGENT_FILE_PATH,
        ensureArtifactFile: ensureCoderDeveloperAgentFile,
    },
    {
        relativeFilePath: AGENTS_FILE_PATH,
        ensureArtifactFile: (projectPath) =>
            ensureCoderMarkdownFile(projectPath, AGENTS_FILE_PATH, getDefaultCoderAgentsFileContent()),
    },
    ...getDefaultCoderProjectPromptTemplateDefinitions().map(createCoderPromptTemplateArtifactDefinition),
];

/**
 * Creates only those referenced artifacts which the freshly added coder scripts point at.
 *
 * An artifact of a script which the project already defines is intentionally **not** created - the project-owned
 * script is kept as is, so it does not reference the default artifact in the first place.
 *
 * @private function of `initializeCoderProjectConfiguration`
 */
export async function ensureCoderReferencedArtifacts(
    projectPath: string,
    referencedArtifactPaths: ReadonlySet<string>,
): Promise<ReadonlyArray<EnsuredCoderReferencedArtifact>> {
    const ensuredArtifacts: Array<EnsuredCoderReferencedArtifact> = [];

    for (const { relativeFilePath, ensureArtifactFile } of CODER_REFERENCED_ARTIFACT_DEFINITIONS) {
        if (!referencedArtifactPaths.has(relativeFilePath)) {
            ensuredArtifacts.push({ relativeFilePath, status: 'not-referenced' });
            continue;
        }

        ensuredArtifacts.push({ relativeFilePath, status: await ensureArtifactFile(projectPath) });
    }

    return ensuredArtifacts;
}

// Note: [🟡] Code for coder init referenced artifacts [coderReferencedArtifacts](src/cli/cli-commands/coder/coderReferencedArtifacts.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
