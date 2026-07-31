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

    it('never documents deprecated commitments', () => {
        const markdown = createStandaloneBookLanguageMarkdown({ isLowLevelCommitmentsIncluded: true });

        expect(markdown).not.toContain('### <a id="commitment-template"></a>');
        expect(markdown).not.toContain('### <a id="commitment-persona"></a>');
        expect(markdown).not.toContain('`TEMPLATE`');
    });

    it('omits the low level commitments chapter unless it is requested', () => {
        const withoutLowLevelCommitments = createStandaloneBookLanguageMarkdown();
        const withLowLevelCommitments = createStandaloneBookLanguageMarkdown({ isLowLevelCommitmentsIncluded: true });

        expect(withoutLowLevelCommitments).not.toContain('Low level commitments');
        expect(withoutLowLevelCommitments).not.toContain('### <a id="commitment-model"></a>');

        expect(withLowLevelCommitments).toContain('## <a id="low-level-commitments"></a>Low level commitments');
        expect(withLowLevelCommitments.indexOf('### <a id="commitment-model"></a>')).toBeGreaterThan(
            withLowLevelCommitments.indexOf('## <a id="low-level-commitments"></a>'),
        );
    });

    it('does not describe the removed execution and compilation model', () => {
        const markdown = createStandaloneBookLanguageMarkdown();

        expect(markdown).not.toContain('Execution and compilation model');
        expect(markdown).not.toContain('#execution-and-compilation-model');
    });

    it('writes the manual in the requested language', () => {
        const czechMarkdown = createStandaloneBookLanguageMarkdown({ language: 'cs' });

        expect(czechMarkdown).toContain('# Příručka jazyka Book');
        expect(czechMarkdown).toContain('## <a id="table-of-contents"></a>Obsah');
        expect(czechMarkdown).toContain('## <a id="what-book-language-is"></a>Co je jazyk Book');
        expect(czechMarkdown).toContain('**Stav:**');
    });

    it('falls back to English for unsupported languages', () => {
        expect(createStandaloneBookLanguageMarkdown({ language: 'de' })).toContain('# Book Language blueprint');
        expect(createStandaloneBookLanguageMarkdown({ language: 'cs-CZ' })).toContain('# Příručka jazyka Book');
    });
});
