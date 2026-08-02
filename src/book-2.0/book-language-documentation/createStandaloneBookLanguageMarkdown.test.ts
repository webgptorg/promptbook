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
        expect(markdown).toContain('**Commitments used:** [`TEAM`](#commitment-team), [`RULE`](#commitment-rule)');
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
        expect(markdown).toContain('- [⚖️ `RULE`](#commitment-rule)');
        expect(markdown).toContain('**Commitments used:** [`GOAL`](#commitment-goal)');
    });

    it('never documents deprecated commitments', () => {
        const markdown = createStandaloneBookLanguageMarkdown({ isLowLevelCommitmentsIncluded: true });

        expect(markdown).not.toContain('### <a id="commitment-template"></a>');
        expect(markdown).not.toContain('### <a id="commitment-persona"></a>');
        expect(markdown).not.toContain('`TEMPLATE`');
    });

    it('does not document unfinished commitments or commitment implementation details', () => {
        const markdown = createStandaloneBookLanguageMarkdown({ isLowLevelCommitmentsIncluded: true });

        expect(markdown).not.toContain('### <a id="commitment-expect"></a>');
        expect(markdown).not.toContain('Implemented commitments');
        expect(markdown).not.toContain('Placeholder commitments');
        expect(markdown).not.toContain('Commitment groups');
        expect(markdown).not.toContain('createTypeRegex');
        expect(markdown).not.toContain('createRegex');
        expect(markdown).toContain('Number of commitments');
    });

    it('documents references as agent references and simplifies commitment examples', () => {
        const markdown = createStandaloneBookLanguageMarkdown();

        expect(markdown).toContain('**Multiple agent**');
        expect(markdown).toContain('Start and end with <code>```</code>');
        expect(markdown).toContain('`@Foo` and `{Foo foo}` reference another agent; they are not parameter notation.');
        expect(markdown).not.toContain('Commitment keywords currently recognized');
        expect(markdown).toContain('Customer Support Agent\n\nRULE Always ask for clarification');
        expect(markdown).toContain('RULE Never provide medical or legal advice\n\nCLOSED');
        expect(markdown).not.toContain('RULES Never provide medical or legal advice');
        expect(markdown).toContain('NOTE Remember to update the knowledge base monthly');
        expect(markdown).not.toContain('COMMENT Remember to update the knowledge base monthly');
    });

    it('links the generated-from sources to the Promptbook repository', () => {
        const markdown = createStandaloneBookLanguageMarkdown();

        expect(markdown).toContain(
            '[Commitments registry and runtime documentation](https://github.com/webgptorg/promptbook/tree/main/src/commitments)',
        );
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
        expect(czechMarkdown).not.toContain('**Stav:**');
    });

    it('falls back to English for unsupported languages', () => {
        expect(createStandaloneBookLanguageMarkdown({ language: 'de' })).toContain('# Book Language blueprint');
        expect(createStandaloneBookLanguageMarkdown({ language: 'cs-CZ' })).toContain('# Příručka jazyka Book');
    });
});
