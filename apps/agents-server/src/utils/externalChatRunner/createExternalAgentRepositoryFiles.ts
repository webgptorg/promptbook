import { spaceTrim } from 'spacetrim';
import { PROMPTBOOK_ENGINE_VERSION } from '../../../../../src/version';

/**
 * Files that should exist in every external agent runner repository.
 */
export type ExternalAgentRepositoryFiles = {
    agentBook: string;
    gitignore: string;
    packageJson: string;
    readme: string;
};

/**
 * Creates all baseline files for one external agent repository.
 */
export function createExternalAgentRepositoryFiles(options: {
    agentName: string;
    agentPermanentId: string;
    agentSource: string;
}): ExternalAgentRepositoryFiles {
    return {
        agentBook: normalizeTextFile(options.agentSource),
        gitignore: createExternalAgentRepositoryGitignore(),
        packageJson: createExternalAgentRepositoryPackageJson(),
        readme: createExternalAgentRepositoryReadme(options),
    };
}

/**
 * Creates `.gitignore` content for runner repositories.
 */
function createExternalAgentRepositoryGitignore(): string {
    return normalizeTextFile(
        spaceTrim(`
            .env

            node_modules
            .promptbook

            # Promptbook Coder
            /.tmp
            /.promptbook/ptbk-coder
        `),
    );
}

/**
 * Creates `package.json` content for runner repositories.
 */
function createExternalAgentRepositoryPackageJson(): string {
    return `${JSON.stringify(
        {
            dependencies: {
                ptbk: PROMPTBOOK_ENGINE_VERSION,
            },
            scripts: {
                start: 'npm run agent:run',
                'agent:run': 'npx ptbk agent run --agent github-copilot --model gpt-5.4',
            },
        },
        null,
        4,
    )}\n`;
}

/**
 * Creates `README.md` content for runner repositories.
 */
function createExternalAgentRepositoryReadme(options: { agentName: string; agentPermanentId: string }): string {
    return normalizeTextFile(
        spaceTrim(`
            # ${options.agentName}

            This repository is managed by Promptbook Agents Server.

            - Agent permanent ID: \`${options.agentPermanentId}\`
            - Agent source: \`agent.book\`
            - Queued messages: \`messages/queued/*.book\`
            - Finished messages: \`messages/finished/*.book\`
            - Failed messages: \`messages/failed/*.book\`

            The external runner is expected to process queued message books and move them to
            \`messages/finished\` or \`messages/failed\`.
        `),
    );
}

/**
 * Normalizes generated text files to LF and one trailing newline.
 */
function normalizeTextFile(value: string): string {
    return `${spaceTrim(value).replace(/\r\n/g, '\n')}\n`;
}
