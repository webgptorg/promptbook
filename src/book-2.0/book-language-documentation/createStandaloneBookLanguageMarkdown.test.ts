import { describe, expect, it } from '@jest/globals';
import type { string_book } from '../agent-source/string_book';
import { createStandaloneBookLanguageMarkdown } from './createStandaloneBookLanguageMarkdown';

describe('createStandaloneBookLanguageMarkdown', () => {
    it('uses selected server agents as examples and prioritizes their commitments', () => {
        const markdown = createStandaloneBookLanguageMarkdown({
            agents: [
                {
                    agentName: 'Server Researcher',
                    agentSource: `Server Researcher

TEAM Ask {Source Reviewer} to validate sources.
TEAM Ask {Risk Reviewer} to identify uncertainty.
RULE Cite every factual claim.` as string_book,
                },
            ],
        });

        expect(markdown).toContain('Commitment catalog (used commitments first)');
        expect(markdown).toContain('### <a id="example-server-researcher"></a>Server Researcher');
        expect(markdown).toContain('**Commitments used:** `TEAM`, `RULE`');
        expect(markdown).toContain('TEAM Ask {Source Reviewer} to validate sources.');
        expect(markdown).not.toContain('Minimal hello-world agent');
        expect(markdown.indexOf('### <a id="commitment-team"></a>')).toBeLessThan(
            markdown.indexOf('### <a id="commitment-goal"></a>'),
        );
    });

    it('keeps the portable examples when no server agents are selected', () => {
        const markdown = createStandaloneBookLanguageMarkdown({ agents: [] });

        expect(markdown).toContain('Commitment catalog (all commitments)');
        expect(markdown).toContain('Minimal hello-world agent');
        expect(markdown).not.toContain('Used in selected agents');
    });
});
