#!/usr/bin/env ts-node
// generate-vscode-grammar.ts

import colors from 'colors';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { COMMITMENT_REGISTRY } from '../../src/commitments/index';
import { GENERATOR_WARNING } from '../../src/config';
import { assertsError } from '../../src/errors/assertsError';

if (process.cwd() !== join(__dirname, '../..')) {
    console.error(
        colors.red(
            spaceTrim(`
                CWD must be root of the project

                Script: generate-vscode-grammar.ts
                Current CWD: ${process.cwd()}
                Expected CWD: ${join(__dirname, '../..')}
            `),
        ),
    );
    process.exit(1);
}

const NOTE_TYPES = new Set(['NOTE', 'NOTES', 'COMMENT', 'NONCE', 'TODO']);
const DELETE_TYPES = new Set(['DELETE', 'CANCEL', 'DISCARD', 'REMOVE']);

/**
 * Converts a commitment's createTypeRegex() JavaScript RegExp source into a
 * TextMate/Oniguruma-compatible pattern string.
 *
 * The only transformation needed is replacing JS named capture group `(?<type>`
 * with a non-capturing group `(?:` since TextMate uses named captures differently.
 */
function toTmPattern(commitment: (typeof COMMITMENT_REGISTRY)[number]): string {
    return commitment.createTypeRegex().source.replace('(?<type>', '(?:');
}

/**
 * Maps a commitment to the TextMate scope name used for syntax highlighting.
 */
function toScopeName(commitment: (typeof COMMITMENT_REGISTRY)[number]): string {
    if (NOTE_TYPES.has(commitment.type)) {
        return 'comment.line.commitment.book';
    }
    if (DELETE_TYPES.has(commitment.type)) {
        return 'keyword.control.delete.commitment.book';
    }
    if (commitment.deprecation !== undefined) {
        return 'invalid.deprecated.commitment.book';
    }
    if (commitment.isImportant) {
        return 'keyword.control.commitment.book';
    }
    return 'keyword.other.commitment.book';
}

async function generateVscodeGrammar(): Promise<void> {
    // Sort by type length descending so longer (more specific) patterns are
    // checked first — e.g. `USE SEARCH ENGINE` before `USE SEARCH` (alias).
    const sortedCommitments = [...COMMITMENT_REGISTRY].sort(
        (a, b) => b.type.length - a.type.length || a.type.localeCompare(b.type),
    );

    const commitmentPatterns = sortedCommitments.map((commitment) => ({
        name: toScopeName(commitment),
        match: toTmPattern(commitment),
    }));

    const grammar = {
        comment: GENERATOR_WARNING,
        '--generated-from': 'scripts/generate-vscode-grammar/generate-vscode-grammar.ts',
        '--generated-source': 'src/commitments/index.ts COMMITMENT_REGISTRY',
        name: 'Book Markdown',
        scopeName: 'text.book',
        fileTypes: ['book', 'ptbk'],
        patterns: [{ include: '#blocks' }],
        repository: {
            blocks: {
                patterns: [
                    { include: '#headers' },
                    { include: '#comments' },
                    { include: '#codeblocks' },
                    { include: '#blockquotes' },
                    { include: '#tables' },
                    { include: '#commitments' },
                    { include: '#lists' },
                    { include: '#inline' },
                ],
            },
            commitments: {
                patterns: commitmentPatterns,
            },
            headers: {
                patterns: [
                    {
                        name: 'heading.1.book',
                        match: '^(#{1})\\s+(.*)$',
                        captures: {
                            '1': { name: 'punctuation.definition.heading.book' },
                            '2': { name: 'entity.name.section.book' },
                        },
                    },
                    {
                        name: 'heading.2.book',
                        match: '^(#{2,})\\s+(.*)$',
                        captures: {
                            '1': { name: 'punctuation.definition.heading.book' },
                            '2': { name: 'entity.name.section.book' },
                        },
                    },
                ],
            },
            inline: {
                patterns: [
                    {
                        name: 'markup.bold.book',
                        match: '\\*\\*([^*]+)\\*\\*',
                        captures: { '1': { name: 'markup.bold.book' } },
                    },
                    {
                        name: 'markup.italic.book',
                        match: '\\*([^*]+)\\*',
                        captures: { '1': { name: 'markup.italic.book' } },
                    },
                    {
                        name: 'markup.inline.raw.string.book',
                        match: '`([^`]+)`',
                        captures: { '1': { name: 'markup.inline.raw.string.book' } },
                    },
                    {
                        name: 'markup.underline.link.book',
                        match: '\\[([^\\]]+)\\]\\(([^)]+)\\)',
                        captures: {
                            '1': { name: 'string.other.link.title.book' },
                            '2': { name: 'markup.underline.link.book' },
                        },
                    },
                    {
                        name: 'variable.parameter.book',
                        match: '\\{([^}]+)\\}',
                        captures: { '1': { name: 'variable.parameter.book' } },
                    },
                    {
                        name: 'entity.name.agent-reference.book',
                        match: '(?<=\\s|^)@([A-Za-z][A-Za-z0-9 _-]*)',
                        captures: { '1': { name: 'entity.name.agent-reference.book' } },
                    },
                ],
            },
            lists: {
                patterns: [
                    {
                        name: 'markup.list.unnumbered.book',
                        match: '^\\s*([-*+])\\s+(.*)$',
                        captures: {
                            '1': { name: 'punctuation.definition.list.book' },
                            '2': { name: 'markup.list.item.book' },
                        },
                    },
                    {
                        name: 'markup.list.numbered.book',
                        match: '^\\s*(\\d+[.)])\\s+(.*)$',
                        captures: {
                            '1': { name: 'punctuation.definition.list.book' },
                            '2': { name: 'markup.list.item.book' },
                        },
                    },
                ],
            },
            blockquotes: {
                name: 'markup.quote.book',
                begin: '^\\s*>\\s*',
                end: '$',
                patterns: [{ include: '#inline' }],
            },
            codeblocks: {
                name: 'markup.fenced_code.block.book',
                begin: '^\\s*(`{3,}|~{3,})(\\w*).*$',
                end: '^\\s*\\1\\s*$',
                beginCaptures: {
                    '1': { name: 'punctuation.definition.fenced_code.begin.book' },
                    '2': { name: 'entity.name.scope.book' },
                },
                endCaptures: {
                    '0': { name: 'punctuation.definition.fenced_code.end.book' },
                },
                patterns: [{ include: 'source.js' }],
            },
            tables: {
                patterns: [
                    {
                        name: 'markup.table.book',
                        match: '^\\|(.+)\\|$',
                        captures: {
                            '1': {
                                patterns: [
                                    {
                                        match: '[^|]+',
                                        name: 'markup.table.cell.book',
                                    },
                                ],
                            },
                        },
                    },
                    {
                        name: 'markup.table.delimiter.book',
                        match: '^\\|\\s*([-:]+[-| :]*?)\\s*\\|$',
                    },
                ],
            },
            comments: {
                patterns: [
                    {
                        name: 'comment.block.book',
                        begin: '<!--',
                        end: '-->',
                        patterns: [{ include: '#inline' }],
                    },
                ],
            },
        },
    };

    const outputPath = join(__dirname, '../../apps/vscode-extension/syntaxes/book.tmLanguage.json');
    await writeFile(outputPath, JSON.stringify(grammar, null, 4), 'utf-8');

    console.log(colors.green(`✅ Generated VSCode grammar → ${outputPath}`));
    console.log(colors.cyan(`   ${commitmentPatterns.length} commitment patterns generated from COMMITMENT_REGISTRY`));
}

generateVscodeGrammar().catch((error) => {
    assertsError(error);
    console.error(colors.red(`❌ ${error.name}: ${error.message}`));
    process.exit(1);
});
