import { describe, expect, it } from '@jest/globals';
import { createTeamToolName } from './createTeamToolName';
import { createAgentModelRequirements } from './createAgentModelRequirements';
import type { AgentReferenceResolver } from './AgentReferenceResolver';
import { createPseudoUserTeammateLabel, PSEUDO_AGENT_USER_URL } from './pseudoAgentReferences';
import { validateBook } from './string_book';

describe('USE SEARCH ENGINE and USE BROWSER commitments', () => {
    /* TODO: [🔰] Uncomment this test
    it('should add web_search tool when USE SEARCH ENGINE is used', async () => {
        const agentSource = validateBook(`
            Test Agent
            USE SEARCH ENGINE Hledej informace o Přemyslovcích
        `);
        const requirements = await createAgentModelRequirements(agentSource);
        const searchTool = requirements.tools?.find((tool) => tool.name === 'web_search');
        expect(searchTool).toBeDefined();
        expect(searchTool?.description).toContain('Hledej informace o Přemyslovcích');
        expect(requirements.metadata?.useSearchEngine).toBe('Hledej informace o Přemyslovcích');
    });
    */

    it('should add web_browser tool when USE BROWSER is used', async () => {
        const agentSource = validateBook(`
            Test Agent
            USE BROWSER
        `);
        const requirements = await createAgentModelRequirements(agentSource);
        const fetch_url_content = requirements.tools?.find((tool) => tool.name === 'fetch_url_content');
        expect(fetch_url_content).toBeDefined();
        const run_browser = requirements.tools?.find((tool) => tool.name === 'run_browser');
        expect(run_browser).toBeDefined();
    });

    it('should add teammate tools when TEAM is used', async () => {
        const agentSource = validateBook(`
            Test Agent
            TEAM https://agents.ptbk.ik/agents/joe-green
        `);
        const requirements = await createAgentModelRequirements(agentSource);
        const teamTool = requirements.tools?.find((tool) => tool.name.startsWith('team_chat_'));
        expect(teamTool).toBeDefined();
        expect(requirements._metadata?.teammates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    url: 'https://agents.ptbk.ik/agents/joe-green',
                }),
            ]),
        );
        expect(requirements.systemMessage).toContain('## Teammates:');
        expect(requirements.systemMessage).toContain('team_chat_joe_green_');
        expect(requirements.systemMessage).not.toContain('https://agents.ptbk.ik/agents/joe-green');
    });

    it('should rename `{User}` teammate and link section text with tool name', async () => {
        const pseudoUserResolver: AgentReferenceResolver = {
            resolveCommitmentContent: async (_commitmentType, rawContent) =>
                rawContent.replace(/\{user\}/gi, PSEUDO_AGENT_USER_URL),
        };

        const teamContent = `Ask ${PSEUDO_AGENT_USER_URL} for everything. Always asks him in English`;
        const pseudoUserLabel = createPseudoUserTeammateLabel(teamContent);
        const expectedToolName = createTeamToolName(PSEUDO_AGENT_USER_URL, pseudoUserLabel);

        const agentSource = validateBook(`
            Interacting with User
            LANGUAGE Czech
            TEAM Ask {User} for everything. Always asks him in English
            CLOSED
        `);
        const requirements = await createAgentModelRequirements(agentSource, undefined, undefined, undefined, {
            agentReferenceResolver: pseudoUserResolver,
        });

        expect(requirements.tools).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: expectedToolName,
                    description: `Consult teammate ${pseudoUserLabel}`,
                }),
            ]),
        );
        expect(requirements.systemMessage).toContain('## Language:');
        expect(requirements.systemMessage).toContain('## Teammates:');
        expect(requirements.systemMessage).toContain(
            `Ask ${pseudoUserLabel} for everything. Always asks him in English`,
        );
        expect(requirements.systemMessage).toContain(`1) ${pseudoUserLabel} tool \`${expectedToolName}\``);
        expect(requirements.systemMessage).not.toContain('pseudo-agent.promptbook');
    });

    it('should add project tools when USE PROJECT is used', async () => {
        const agentSource = validateBook(`
            Test Agent
            USE PROJECT https://github.com/example/project
        `);
        const requirements = await createAgentModelRequirements(agentSource);

        expect(requirements.tools).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'project_list_files' }),
                expect.objectContaining({ name: 'project_read_file' }),
                expect.objectContaining({ name: 'project_upsert_file' }),
                expect.objectContaining({ name: 'project_delete_file' }),
                expect.objectContaining({ name: 'project_create_branch' }),
                expect.objectContaining({ name: 'project_create_pull_request' }),
            ]),
        );

        expect(requirements._metadata?.useProject).toBe(true);
        expect(requirements._metadata?.useProjects).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    url: 'https://github.com/example/project',
                    slug: 'example/project',
                }),
            ]),
        );
    });

    it('should add wallet tools when WALLET is used', async () => {
        const agentSource = validateBook(`
            Test Agent
            WALLET Store private credentials for project access
        `);
        const requirements = await createAgentModelRequirements(agentSource);

        expect(requirements.tools).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'retrieve_wallet_records' }),
                expect.objectContaining({ name: 'store_wallet_record' }),
                expect.objectContaining({ name: 'update_wallet_record' }),
                expect.objectContaining({ name: 'delete_wallet_record' }),
                expect.objectContaining({ name: 'request_wallet_record' }),
            ]),
        );
        expect(requirements._metadata?.useWallet).toBe('Store private credentials for project access');
    });

    it('should treat `FROM {Void}` as explicit no-parent inheritance', async () => {
        const agentSource = validateBook(`
            Test Agent
            FROM {VoId}
        `);

        const requirements = await createAgentModelRequirements(agentSource);
        expect(requirements.parentAgentUrl).toBeNull();
    });

    /* TODO: [🔰] Uncomment this test
    it('should add both tools when both commitments are used', async () => {
        const agentSource = validateBook(`
            Test Agent
            USE SEARCH ENGINE
            USE BROWSER
        `);
        const requirements = await createAgentModelRequirements(agentSource);
        expect(requirements.tools?.some((tool) => tool.name === 'web_search')).toBe(true);
        expect(requirements.tools?.some((tool) => tool.name === 'web_browser')).toBe(true);
    });
    */
});
