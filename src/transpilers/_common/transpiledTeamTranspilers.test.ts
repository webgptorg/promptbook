import { describe, expect, it } from '@jest/globals';
import { $provideLlmToolsForTestingAndScriptsAndPlayground } from '../../llm-providers/_common/register/$provideLlmToolsForTestingAndScriptsAndPlayground';
import { book } from '../../pipeline/book-notation';
import type { BookTranspiler } from './BookTranspiler';
import type { TranspiledTeamExport } from './TranspiledTeamExport';
import { AgentOsTranspiler } from '../agent-os/AgentOsTranspiler';
import { AnthropicClaudeManagedTranspiler } from '../anthropic-claude-managed/AnthropicClaudeManagedTranspiler';
import { AnthropicClaudeSdkTranspiler } from '../anthropic-claude-sdk/AnthropicClaudeSdkTranspiler';
import { E2BTranspiler } from '../e2b/E2BTranspiler';
import { OpenAiAgentsTranspiler } from '../openai-agents/OpenAiAgentsTranspiler';
import { OpenAiSdkTranspiler } from '../openai-sdk/OpenAiSdkTranspiler';

/**
 * Root agent URL used by TEAM transpiler coverage.
 */
const ROOT_AGENT_URL = 'https://local.example/agents/master';

/**
 * Teammate URL used by TEAM transpiler coverage.
 */
const TEAMMATE_AGENT_URL = 'https://local.example/agents/dns-expert';

/**
 * Source of the root agent used by TEAM transpiler coverage.
 */
const ROOT_AGENT_SOURCE = book`
    Master

    PERSONA You coordinate experts.
    TEAM Ask ${TEAMMATE_AGENT_URL} for DNS details.
`;

/**
 * Source of the teammate embedded into transpiled TEAM exports.
 */
const TEAMMATE_AGENT_SOURCE = book`
    DNS Expert

    PERSONA You know DNS records.
`;

/**
 * Minimal server-resolved TEAM export fixture.
 */
const TRANSPILED_TEAM = {
    rootAgentUrl: ROOT_AGENT_URL,
    agents: [
        {
            url: TEAMMATE_AGENT_URL,
            agentName: 'DNS Expert',
            agentSource: TEAMMATE_AGENT_SOURCE,
            modelRequirements: {
                systemMessage: 'You know DNS records.',
                promptSuffix: '',
                modelName: 'gpt-4o',
                temperature: 0.7,
                tools: [],
            },
            teammates: [],
        },
    ],
} as const satisfies TranspiledTeamExport;

describe('transpiled TEAM support', () => {
    const transpilers: ReadonlyArray<BookTranspiler> = [
        AgentOsTranspiler,
        AnthropicClaudeManagedTranspiler,
        AnthropicClaudeSdkTranspiler,
        E2BTranspiler,
        OpenAiAgentsTranspiler,
        OpenAiSdkTranspiler,
    ];

    it.each(transpilers)('embeds TEAM hierarchy in %s', async (transpiler) => {
        const llm = await $provideLlmToolsForTestingAndScriptsAndPlayground();
        const code = await transpiler.transpileBook(
            ROOT_AGENT_SOURCE,
            { llm },
            {
                isVerbose: true,
                transpiledTeam: TRANSPILED_TEAM,
            },
        );

        expect(code).toContain('PROMPTBOOK_TEAM_AGENTS');
        expect(code).toContain('consultPromptbookBuiltInTeamMember');
        expect(code).toContain('DNS Expert');
        expect(code).toContain('Original teammate Book source:');
        expect(code).not.toContain('RemoteAgent.connect');
        expect(code).not.toContain('buildTeammateMetadata(entry)');
    });
});
