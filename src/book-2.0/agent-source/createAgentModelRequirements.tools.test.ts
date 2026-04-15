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
        expect(requirements.systemMessage).toContain('team_chat_joe_green');
        expect(requirements.systemMessage).not.toContain('team_chat_joe_green_');
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
        const pseudoUserTool = requirements.tools?.find((tool) => tool.name === expectedToolName);

        expect(requirements.tools).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: expectedToolName,
                }),
            ]),
        );
        expect(pseudoUserTool?.description).toContain(`Consult teammate ${pseudoUserLabel}`);
        expect(pseudoUserTool?.description).toContain('TEAM instructions:');
        expect(pseudoUserTool?.description).toContain('for everything');
        expect(requirements.systemMessage).toContain('## Language:');
        expect(requirements.systemMessage).toContain('## Teammates:');
        expect(requirements.systemMessage).toContain(
            'If a teammate is relevant to the request, consult that teammate using the matching tool.',
        );
        expect(requirements.systemMessage).toContain(`1) ${pseudoUserLabel} tool \`${expectedToolName}\``);
        expect(requirements.systemMessage).toContain('TEAM instructions: for everything');
        expect(requirements.systemMessage).not.toContain('pseudo-agent.promptbook');
    });

    it('should keep TEAM instructions in the model-facing tool description and system message', async () => {
        const teammateUrl = 'https://agents.ptbk.ik/agents/dns-expert';
        const agentSource = validateBook(`
            Test Agent
            TEAM Ask for DNS records ${teammateUrl}
        `);
        const requirements = await createAgentModelRequirements(agentSource, undefined, undefined, undefined, {
            agentReferenceResolver: {
                resolveCommitmentContent: async (_commitmentType, rawContent) => rawContent,
                resolveTeammateProfile: async (url) =>
                    url === teammateUrl
                        ? {
                              agentName: 'DNS Expert',
                              personaDescription: 'I know DNS records of Domain ptbk.io.',
                          }
                        : null,
            },
        });
        const expectedToolName = createTeamToolName(teammateUrl, 'DNS Expert');
        const teamTool = requirements.tools?.find((tool) => tool.name === expectedToolName);

        expect(teamTool).toBeDefined();
        expect(teamTool?.description).toContain('Consult teammate DNS Expert');
        expect(teamTool?.description).toContain('TEAM instructions: Ask for DNS records');
        expect(teamTool?.description).toContain('Profile: I know DNS records of Domain ptbk.io.');
        expect(requirements.systemMessage).toContain(
            'Do not ask the user for information that a listed teammate can provide directly.',
        );
        expect(requirements.systemMessage).toContain(`1) DNS Expert tool \`${expectedToolName}\``);
        expect(requirements.systemMessage).toContain('TEAM instructions: Ask for DNS records');
        expect(requirements.systemMessage).toContain('Profile: I know DNS records of Domain ptbk.io.');
    });

    it('should preserve TEAM instructions for compact teammate references resolved by the server', async () => {
        const teammateUrl = 'https://local.example/agents/slave';
        const agentSource = validateBook(`
            Master
            FROM {Void}
            TEAM Ask for anything {slave}
            CLOSED
        `);

        const requirements = await createAgentModelRequirements(agentSource, undefined, undefined, undefined, {
            agentReferenceResolver: {
                resolveCommitmentContent: async (_commitmentType, rawContent) =>
                    rawContent.replace('{slave}', teammateUrl),
                resolveTeammateProfile: async (url) =>
                    url === teammateUrl
                        ? {
                              agentName: 'slave',
                              personaDescription: 'I know DNS records of Domain ptbk.io.',
                          }
                        : null,
            },
        });
        const teamTool = requirements.tools?.find((tool) => tool.name === 'team_chat_slave');

        expect(teamTool).toBeDefined();
        expect(teamTool?.description).toContain('Consult teammate slave');
        expect(teamTool?.description).toContain('TEAM instructions: Ask for anything');
        expect(teamTool?.description).toContain('Profile: I know DNS records of Domain ptbk.io.');
        expect(requirements.systemMessage).toContain('## Teammates:');
        expect(requirements.systemMessage).toContain('TEAM instructions: Ask for anything');
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

    it('should add send_email tool when USE EMAIL is used', async () => {
        const agentSource = validateBook(`
            Test Agent
            USE EMAIL agent@example.com
        `);
        const requirements = await createAgentModelRequirements(agentSource);

        expect(requirements.tools).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'send_email' })]));
        expect(requirements._metadata?.useEmail).toBe(true);
        expect(requirements._metadata?.useEmailSender).toBe('agent@example.com');
    });

    it('should add calendar tools when USE CALENDAR is used', async () => {
        const agentSource = validateBook(`
            Test Agent
            USE CALENDAR https://calendar.google.com/calendar/u/0/r
        `);
        const requirements = await createAgentModelRequirements(agentSource);

        expect(requirements.tools).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'calendar_list_events' }),
                expect.objectContaining({ name: 'calendar_get_event' }),
                expect.objectContaining({ name: 'calendar_create_event' }),
                expect.objectContaining({ name: 'calendar_update_event' }),
                expect.objectContaining({ name: 'calendar_delete_event' }),
                expect.objectContaining({ name: 'calendar_invite_guests' }),
            ]),
        );
        expect(requirements._metadata?.useCalendar).toBe(true);
        expect(requirements._metadata?.useCalendars).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    provider: 'google',
                    calendarId: 'primary',
                }),
            ]),
        );
    });

    it('should add timeout tools when USE TIMEOUT is used', async () => {
        const agentSource = validateBook(`
            Test Agent
            USE TIMEOUT
        `);
        const requirements = await createAgentModelRequirements(agentSource);

        expect(requirements.tools).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'set_timeout' }),
                expect.objectContaining({ name: 'cancel_timeout' }),
                expect.objectContaining({ name: 'list_timeouts' }),
                expect.objectContaining({ name: 'update_timeout' }),
            ]),
        );
        expect(requirements._metadata?.useTimeout).toBe(true);
    });

    it('should not interpret the agent name as an MCP server when the title starts with `MCP`', async () => {
        const agentSource = validateBook(`
            MCP https://title.example.com/catalog
            MCP https://runtime.example.com/server
        `);
        const requirements = await createAgentModelRequirements(agentSource);

        expect(requirements.mcpServers).toEqual(['https://runtime.example.com/server']);
    });

    it('should ignore WALLET and keep wallet-backed tools available through USE EMAIL and USE PROJECT', async () => {
        const agentSource = validateBook(`
            Test Agent
            WALLET Store private credentials for project access
            USE EMAIL agent@example.com
            USE PROJECT https://github.com/example/project
        `);
        const requirements = await createAgentModelRequirements(agentSource);

        expect(requirements.tools).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'send_email' }),
                expect.objectContaining({ name: 'project_list_files' }),
            ]),
        );
        const toolNames = (requirements.tools || []).map((tool) => tool.name);
        expect(toolNames).not.toContain('retrieve_wallet_records');
        expect(toolNames).not.toContain('store_wallet_record');
        expect(toolNames).not.toContain('update_wallet_record');
        expect(toolNames).not.toContain('delete_wallet_record');
        expect(toolNames).not.toContain('request_wallet_record');
        expect(requirements._metadata?.useWallet).toBeUndefined();
    });

    it('should treat `FROM {Void}` as explicit no-parent inheritance', async () => {
        const agentSource = validateBook(`
            Test Agent
            FROM {VoId}
        `);

        const requirements = await createAgentModelRequirements(agentSource);
        expect(requirements.parentAgentUrl).toBeNull();
    });

    it('should treat `FROM {Null}` as explicit no-parent inheritance', async () => {
        const agentSource = validateBook(`
            Test Agent
            FROM {NuLl}
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
