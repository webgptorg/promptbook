import { createAgentModelRequirements } from './createAgentModelRequirements';
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
        expect(requirements.metadata?.useBrowser).toBe(true);
    });

    it('should add teammate tools when TEAM is used', async () => {
        const agentSource = validateBook(`
            Test Agent
            TEAM https://agents.ptbk.ik/agents/joe-green
        `);
        const requirements = await createAgentModelRequirements(agentSource);
        const teamTool = requirements.tools?.find((tool) => tool.name.startsWith('team_chat_'));
        expect(teamTool).toBeDefined();
        expect(requirements.metadata?.teammates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    url: 'https://agents.ptbk.ik/agents/joe-green',
                }),
            ]),
        );
        expect(requirements.systemMessage).toContain('Teammates:');
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
