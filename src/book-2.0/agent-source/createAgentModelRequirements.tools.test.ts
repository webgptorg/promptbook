import { spaceTrim } from 'spacetrim';
import { describe, expect, it } from '@jest/globals';
import type { AgentReferenceResolver } from './AgentReferenceResolver';
import { createAgentModelRequirements } from './createAgentModelRequirements';
import { createTeamToolName } from './createTeamToolName';
import { createPseudoUserTeammateLabel, PSEUDO_AGENT_USER_URL } from './pseudoAgentReferences';
import { validateBook } from './string_book';

describe('commitment tools', () => {
    it('should add teammate tools when TEAM is used', async () => {
        const agentSource = validateBook(spaceTrim(`
            Test Agent
            TEAM https://agents.ptbk.ik/agents/joe-green
        `));
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
        expect(requirements.systemMessage).toContain('## Teammates');
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

        const agentSource = validateBook(spaceTrim(`
            Interacting with User
            LANGUAGE Czech
            TEAM Ask {User} for everything. Always asks him in English
            CLOSED
        `));
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
        expect(requirements.systemMessage).toContain('## Language');
        expect(requirements.systemMessage).toContain('## Teammates');
        expect(requirements.systemMessage).toContain(
            'If a teammate is relevant to the request, consult that teammate using the matching tool.',
        );
        expect(requirements.systemMessage).toContain(`1) ${pseudoUserLabel} tool \`${expectedToolName}\``);
        expect(requirements.systemMessage).toContain('TEAM instructions: for everything');
        expect(requirements.systemMessage).not.toContain('pseudo-agent.promptbook');
    });

    it('should keep TEAM instructions in the model-facing tool description and system message', async () => {
        const teammateUrl = 'https://agents.ptbk.ik/agents/dns-expert';
        const agentSource = validateBook(spaceTrim(`
            Test Agent
            TEAM Ask for DNS records ${teammateUrl}
        `));
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
        const agentSource = validateBook(spaceTrim(`
            Master
            FROM {Void}
            TEAM Ask for anything {slave}
            CLOSED
        `));

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
        expect(requirements.systemMessage).toContain('## Teammates');
        expect(requirements.systemMessage).toContain('TEAM instructions: Ask for anything');
    });

    it('should add project tools when USE PROJECT is used', async () => {
        const agentSource = validateBook(spaceTrim(`
            Test Agent
            USE PROJECT https://github.com/example/project
        `));
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

    it('should add calendar tools when USE CALENDAR is used', async () => {
        const agentSource = validateBook(spaceTrim(`
            Test Agent
            USE CALENDAR https://calendar.google.com/calendar/u/0/r
        `));
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

    it('should not interpret the agent name as an MCP server when the title starts with `MCP`', async () => {
        const agentSource = validateBook(spaceTrim(`
            MCP https://title.example.com/catalog
            MCP https://runtime.example.com/server
        `));
        const requirements = await createAgentModelRequirements(agentSource);

        expect(requirements.mcpServers).toEqual(['https://runtime.example.com/server']);
    });

    it('should treat `FROM {Void}` as explicit no-parent inheritance', async () => {
        const agentSource = validateBook(spaceTrim(`
            Test Agent
            FROM {VoId}
        `));

        const requirements = await createAgentModelRequirements(agentSource);
        expect(requirements.parentAgentUrl).toBeNull();
    });

    it('should treat `FROM {Null}` as explicit no-parent inheritance', async () => {
        const agentSource = validateBook(spaceTrim(`
            Test Agent
            FROM {NuLl}
        `));

        const requirements = await createAgentModelRequirements(agentSource);
        expect(requirements.parentAgentUrl).toBeNull();
    });
});
