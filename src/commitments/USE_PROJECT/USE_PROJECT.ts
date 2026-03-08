import { spaceTrim } from 'spacetrim';
import type { string_javascript_name } from '../../_packages/types.index';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { BaseCommitmentDefinition } from '../_base/BaseCommitmentDefinition';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';
import { createUseProjectToolFunctions } from './createUseProjectToolFunctions';
import { createUseProjectTools } from './createUseProjectTools';
import { getUseProjectToolTitles } from './getUseProjectToolTitles';
import { normalizeConfiguredProjects } from './normalizeConfiguredProjects';
import { parseUseProjectCommitmentContent, type GitHubRepositoryReference } from './projectReference';
import { UseProjectWallet } from './UseProjectWallet';

/**
 * USE PROJECT commitment definition.
 *
 * `USE PROJECT` enables GitHub repository tooling so the agent can browse source files,
 * edit code, and open pull requests against declared repositories.
 *
 * Authentication is expected through runtime context provided by the host app UI.
 * Hosts can provide manual wallet tokens or auto-issued integration tokens (for example via GitHub App).
 *
 * @private [🪔] Maybe export the commitments through some package
 */
export class UseProjectCommitmentDefinition extends BaseCommitmentDefinition<'USE PROJECT'> {
    public constructor() {
        super('USE PROJECT', ['PROJECT']);
    }

    /**
     * Short one-line description of USE PROJECT.
     */
    get description(): string {
        return 'Enable GitHub project tools for reading/editing repository files and creating pull requests.';
    }

    /**
     * Icon for this commitment.
     */
    get icon(): string {
        return '🧑‍💻';
    }

    /**
     * Markdown documentation for USE PROJECT commitment.
     */
    get documentation(): string {
        return spaceTrim(`
            # USE PROJECT

            Enables the agent to work with files in a GitHub repository and create pull requests.

            ## Key aspects

            - The first repository reference in the commitment should point to GitHub repository (for example \`https://github.com/owner/repo\`).
            - Optional extra instructions can follow the repository reference.
            - The runtime provides a GitHub token (manual wallet token or host-managed integration token).
            - Tools support listing files, reading files, editing files, deleting files, creating branches, and opening pull requests.

            ## Examples

            \`\`\`book
            AI Developer

            PERSONA You are a TypeScript developer
            USE PROJECT https://github.com/example/project
            \`\`\`
        `);
    }

    applyToAgentModelRequirements(requirements: AgentModelRequirements, content: string): AgentModelRequirements {
        const parsedCommitment = parseUseProjectCommitmentContent(content);
        if (!parsedCommitment.repository) {
            return requirements;
        }

        const existingConfiguredProjects = normalizeConfiguredProjects(requirements._metadata?.useProjects);
        addConfiguredProjectIfMissing(existingConfiguredProjects, parsedCommitment.repository);

        const repositoriesList = existingConfiguredProjects.map((project) => `- ${project.url}`).join('\n');
        const extraInstructions = formatOptionalInstructionBlock('Project instructions', parsedCommitment.instructions);

        return this.appendToSystemMessage(
            {
                ...requirements,
                tools: createUseProjectTools(requirements.tools || []),
                _metadata: {
                    ...requirements._metadata,
                    useProject: true,
                    useProjects: existingConfiguredProjects,
                },
            },
            spaceTrim(
                (block) => `
                    Project tools:
                    - You can inspect and edit configured GitHub repositories using project tools.
                    - Configured repositories:
                      ${block(repositoriesList)}
                    - When a repository is not obvious from context, pass "repository" in tool arguments explicitly.
                    - USE PROJECT credentials are read from wallet records (ACCESS_TOKEN, service "${
                        UseProjectWallet.service
                    }", key "${UseProjectWallet.key}").
                    - If credentials are missing, ask the user to connect credentials in host UI and/or add them to wallet.
                    ${block(extraInstructions)}
                `,
            ),
        );
    }

    /**
     * Gets human-readable titles for tool functions provided by this commitment.
     */
    getToolTitles(): Record<string_javascript_name, string> {
        return getUseProjectToolTitles();
    }

    /**
     * Gets GitHub project tool function implementations.
     */
    getToolFunctions(): Record<string_javascript_name, ToolFunction> {
        return createUseProjectToolFunctions();
    }
}

/**
 * Adds repository into configured projects list if it is not already present.
 *
 * @private function of UseProjectCommitmentDefinition
 */
function addConfiguredProjectIfMissing(
    configuredProjects: Array<{ url: string; slug: string; defaultBranch?: string }>,
    repositoryReference: GitHubRepositoryReference,
): void {
    if (configuredProjects.some((project) => project.url === repositoryReference.url)) {
        return;
    }

    configuredProjects.push({
        url: repositoryReference.url,
        slug: repositoryReference.slug,
        defaultBranch: repositoryReference.defaultBranch,
    });
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
