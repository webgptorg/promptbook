import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import {
    AGENT_TEAMMATE_SOURCES_DIRECTORY_NAME,
    type AgentTeamConversationWorkspaceManifest,
} from '../../../src/book-3.0/AgentTeamConversationWorkspace';

/**
 * TEAM workspace information made visible to one coding-harness prompt.
 */
export type AgentTeamPromptWorkspace = {
    readonly relativeWorkspacePath: string;
    readonly manifest: AgentTeamConversationWorkspaceManifest;
};

/**
 * Builds the optional single-run TEAM consultation instructions for a coding harness.
 */
export function buildAgentTeamPromptSection(workspace: AgentTeamPromptWorkspace | undefined): string {
    if (!workspace || workspace.manifest.teammates.length === 0) {
        return '';
    }

    const teammateSections = workspace.manifest.teammates.map((teammate) => {
        const sourcePath = toPromptPath(
            join(workspace.relativeWorkspacePath, AGENT_TEAMMATE_SOURCES_DIRECTORY_NAME, teammate.sourceFileName),
        );
        const transcriptPath = toPromptPath(join(workspace.relativeWorkspacePath, `${teammate.permanentId}--01.book`));
        const instructions = teammate.instructions.trim() || 'No additional TEAM instructions were provided.';

        return spaceTrim(`
            -   ${teammate.agentName}
                -   TEAM instructions: ${instructions}
                -   Read-only source: \`${sourcePath}\`
                -   First transcript file: \`${transcriptPath}\`
        `);
    });

    return spaceTrim(
        (block) => `
            ## Team consultations

            The following teammates are available for this user turn:

            ${block(teammateSections.join('\n'))}

            -   The underlying coding harness is already executing this turn **exactly once**. Never start, queue, or invoke another coding harness, agent runner, or \`ptbk\` command to consult a teammate.
            -   The primary agent remains responsible for the final user-facing \`MESSAGE @Agent\` answer.
            -   Teammate source files are read-only context. When a teammate consultation occurs, record the actual exchange in a new top-level \`.book\` file in \`${toPromptPath(
                workspace.relativeWorkspacePath,
            )}\`.
            -   Name each transcript \`<teammate permanent id>--<sequence>.book\`, for example \`${
                workspace.manifest.teammates[0]!.permanentId
            }--01.book\`.
            -   Every transcript must contain alternating \`MESSAGE @${
                workspace.manifest.primaryAgent.agentName
            }\` and \`MESSAGE @<teammate name>\` blocks. Do not create a transcript for a teammate that was not consulted.
        `,
    );
}

/**
 * Converts a filesystem-relative path into the portable path notation used in prompts.
 */
function toPromptPath(path: string): string {
    return path.replace(/\\/gu, '/');
}
