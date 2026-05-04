import { describe, expect, it } from '@jest/globals';
import { createAgentModelRequirements } from './createAgentModelRequirements';
import { validateBook } from './string_book';

/**
 * Counts literal substring occurrences inside a string.
 *
 * @param haystack - Full text to scan.
 * @param needle - Exact substring to count.
 * @returns Number of literal matches.
 *
 * @private test utility of `createAgentModelRequirements.useCommitmentAggregation.test.ts`
 */
function countOccurrences(haystack: string, needle: string): number {
    return haystack.split(needle).length - 1;
}

describe('createAgentModelRequirements USE commitment aggregation', () => {
    it('keeps USE TIME hard-coded instructions and identical additional instructions only once', async () => {
        const agentSource = validateBook(`
            Time Agent
            USE TIME Prefer the user locale.
            USE TIME Prefer the user locale.
        `);

        const requirements = await createAgentModelRequirements(agentSource);

        expect(
            countOccurrences(
                requirements.systemMessage,
                'If you need more precise current time information, use the tool `get_current_time`.',
            ),
        ).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'Time instructions')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'Prefer the user locale.')).toBe(1);
        expect((requirements.tools || []).filter((tool) => tool.name === 'get_current_time')).toHaveLength(1);
    });

    it('combines distinct USE TIME additional instructions in source order', async () => {
        const agentSource = validateBook(`
            Time Agent
            USE TIME Prefer the user locale.
            USE TIME If the timezone is unknown, use UTC.
        `);

        const requirements = await createAgentModelRequirements(agentSource);

        expect(
            countOccurrences(
                requirements.systemMessage,
                'If you need more precise current time information, use the tool `get_current_time`.',
            ),
        ).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'Time instructions')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'Prefer the user locale.')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'If the timezone is unknown, use UTC.')).toBe(1);
        expect(requirements.systemMessage.indexOf('Prefer the user locale.')).toBeLessThan(
            requirements.systemMessage.indexOf('If the timezone is unknown, use UTC.'),
        );
    });

    it('keeps USE BROWSER hard-coded instructions and tool availability only once', async () => {
        const agentSource = validateBook(`
            Browser Agent
            USE BROWSER
            USE BROWSER
        `);

        const requirements = await createAgentModelRequirements(agentSource);

        expect(
            countOccurrences(
                requirements.systemMessage,
                'Use `fetch_url_content` to retrieve content from specific URLs',
            ),
        ).toBe(1);
        expect((requirements.tools || []).filter((tool) => tool.name === 'fetch_url_content')).toHaveLength(1);
        expect((requirements.tools || []).filter((tool) => tool.name === 'run_browser')).toHaveLength(1);
    });

    it('aggregates repeated USE BROWSER and USE SEARCH ENGINE commitments independently', async () => {
        const agentSource = validateBook(`
            Research Agent
            USE BROWSER Prefer official documentation.
            USE SEARCH ENGINE Search in English.
            USE BROWSER Prefer primary sources.
            USE SEARCH ENGINE Prefer vendor-maintained documentation.
        `);

        const requirements = await createAgentModelRequirements(agentSource);

        expect(
            countOccurrences(
                requirements.systemMessage,
                'Use `fetch_url_content` to retrieve content from specific URLs',
            ),
        ).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'Browser instructions')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'Prefer official documentation.')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'Prefer primary sources.')).toBe(1);
        expect(requirements.systemMessage.indexOf('Prefer official documentation.')).toBeLessThan(
            requirements.systemMessage.indexOf('Prefer primary sources.'),
        );
        expect(countOccurrences(requirements.systemMessage, 'Use `web_search` to find up-to-date information')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'Search instructions')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'Search in English.')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'Prefer vendor-maintained documentation.')).toBe(1);
        expect(requirements.systemMessage.indexOf('Search in English.')).toBeLessThan(
            requirements.systemMessage.indexOf('Prefer vendor-maintained documentation.'),
        );
        expect((requirements.tools || []).filter((tool) => tool.name === 'fetch_url_content')).toHaveLength(1);
        expect((requirements.tools || []).filter((tool) => tool.name === 'run_browser')).toHaveLength(1);
        expect((requirements.tools || []).filter((tool) => tool.name === 'web_search')).toHaveLength(1);
    });

    it('aggregates repeated USE DEEPSEARCH instructions and keeps the tool only once', async () => {
        const agentSource = validateBook(`
            Deep Research Agent
            USE DEEPSEARCH Compare primary sources.
            USE DEEPSEARCH Summarize competing viewpoints.
        `);

        const requirements = await createAgentModelRequirements(agentSource);

        expect(countOccurrences(requirements.systemMessage, 'Use `deep_search` for broader research tasks')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'DeepSearch instructions')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'Compare primary sources.')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'Summarize competing viewpoints.')).toBe(1);
        expect((requirements.tools || []).filter((tool) => tool.name === 'deep_search')).toHaveLength(1);
    });

    it('keeps multi-PERSONA content merged without duplication or reordering', async () => {
        const agentSource = validateBook(`
            Persona Agent
            PERSONA First persona trait.
            PERSONA Second persona trait.
        `);

        const requirements = await createAgentModelRequirements(agentSource);

        expect(countOccurrences(requirements.systemMessage, 'You are Persona Agent')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'First persona trait.')).toBe(1);
        expect(countOccurrences(requirements.systemMessage, 'Second persona trait.')).toBe(1);
        expect(requirements.systemMessage.indexOf('First persona trait.')).toBeLessThan(
            requirements.systemMessage.indexOf('Second persona trait.'),
        );
    });

    it('keeps only the last GOAL commitment effective after rewrite ordering', async () => {
        const agentSource = validateBook(`
            Goal Agent
            GOAL Inherited goal.
            RULE Stay concise.
            GOALS Final goal.
        `);

        const requirements = await createAgentModelRequirements(agentSource);

        expect(countOccurrences(requirements.systemMessage, 'Inherited goal.')).toBe(0);
        expect(countOccurrences(requirements.systemMessage, 'Final goal.')).toBe(1);
        expect(countOccurrences(requirements.promptSuffix, 'Inherited goal.')).toBe(0);
        expect(countOccurrences(requirements.promptSuffix, 'Final goal.')).toBe(1);
        expect(requirements.systemMessage).toContain('## Rules');
        expect(requirements.systemMessage).toContain('-   Stay concise.');
    });
});
