/**
 * Generates the TextMate grammar and snippets for the Book language VSCode extension.
 *
 * Run from the repository root:
 *   ts-node apps/vscode-extension/scripts/generate-grammar.ts
 *
 * Generated files:
 *   apps/vscode-extension/syntaxes/book.tmLanguage.json
 *   apps/vscode-extension/snippets/book.json
 *
 * Note: [⚫] Code in this file should never be published in any package
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { COMMITMENT_REGISTRY } from '../../../src/commitments/index';
import {
    AGENT_REFERENCE_COMMITMENT_TYPES,
    NOTE_COMMITMENT_TYPES,
    TODO_COMMITMENT_TYPES,
} from '../../../src/book-components/BookEditor/BookEditorCommitmentConstants';
import { GENERATOR_WARNING } from '../../../src/config';

const EXTENSION_DIR = join(__dirname, '..');

/**
 * Builds the regex string that matches the start of any note-like or todo commitment block.
 * Used in the `end` pattern to terminate a commitment block when one of these starts.
 */
function buildSpecialCommitmentPattern(types: ReadonlyArray<string>): string {
    return types
        .slice()
        .sort((a, b) => b.length - a.length)
        .join('|');
}

/**
 * Builds the end pattern for a commitment block.
 * The block ends (without consuming the line) when the next commitment starts or when
 * a horizontal-line separator `---` is encountered.
 */
const COMMITMENT_BLOCK_END_PATTERN =
    '(?=^[A-Z][A-Z0-9]+(?:\\s+[A-Z][A-Z0-9]+)*(?:\\s|$))|(?=^\\s*---+\\s*$)';

/**
 * Generates the TextMate grammar object for the Book language.
 * Patterns mirror the Monaco tokenizer in `useBookEditorMonacoLanguage.ts`.
 */
function createBookTmLanguage(): object {
    const todoPattern = buildSpecialCommitmentPattern(TODO_COMMITMENT_TYPES);
    const notePattern = buildSpecialCommitmentPattern(NOTE_COMMITMENT_TYPES);
    const agentRefPattern = buildSpecialCommitmentPattern(AGENT_REFERENCE_COMMITMENT_TYPES);

    return {
        $schema: 'https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json',
        name: 'Book Language',
        scopeName: 'text.book',
        fileTypes: ['book', 'book.md'],
        patterns: [
            { include: '#code-block' },
            { include: '#todo-block' },
            { include: '#note-block' },
            { include: '#agent-reference-block' },
            { include: '#commitment-block' },
        ],
        repository: {
            'code-block': {
                comment: 'Fenced code block — mirrors codeblock state in BookEditor',
                name: 'markup.fenced_code.block.book',
                begin: '^(\\s*```[\\w ]*)$',
                end: '^(\\s*```)\\s*$',
                beginCaptures: {
                    '0': { name: 'punctuation.definition.code.begin.book' },
                },
                endCaptures: {
                    '0': { name: 'punctuation.definition.code.end.book' },
                },
            },
            'todo-block': {
                comment:
                    'TODO commitment block — rendered with high-visibility yellow in BookEditor (todo-commitment token)',
                begin: `^(${todoPattern})(?=\\s|$)`,
                end: COMMITMENT_BLOCK_END_PATTERN,
                beginCaptures: {
                    '1': { name: 'keyword.other.todo.book' },
                },
                name: 'keyword.other.todo.book',
            },
            'note-block': {
                comment:
                    'NOTE/NOTES/NONCE commitment block — rendered with low-visibility gray in BookEditor (note-commitment token)',
                begin: `^(${notePattern})(?=\\s|$)`,
                end: COMMITMENT_BLOCK_END_PATTERN,
                beginCaptures: {
                    '1': { name: 'comment.line.note.book' },
                },
                name: 'comment.line.note.book',
            },
            'agent-reference-block': {
                comment:
                    'FROM/IMPORT/IMPORTS/TEAM commitment block — agent references inside are underlined (agent-reference token)',
                begin: `^(${agentRefPattern})(?=\\s|$)`,
                end: COMMITMENT_BLOCK_END_PATTERN,
                beginCaptures: {
                    '1': { name: 'keyword.commitment.book' },
                },
                patterns: [
                    { include: '#agent-reference' },
                    { include: '#parameter' },
                ],
            },
            'commitment-block': {
                comment:
                    'Any commitment keyword (2+ uppercase words at line start) — mirrors DYNAMIC_COMMITMENT_REGEX in BookEditorMonacoTokenization',
                begin: '^([A-Z][A-Z0-9]+(?:\\s+[A-Z][A-Z0-9]+)*)(?=\\s|$)',
                end: COMMITMENT_BLOCK_END_PATTERN,
                beginCaptures: {
                    '1': { name: 'keyword.commitment.book' },
                },
                patterns: [
                    { include: '#parameter' },
                ],
            },
            'agent-reference': {
                comment: 'Agent reference tokens within FROM/IMPORT/TEAM blocks',
                patterns: [
                    {
                        name: 'entity.name.function.agent-reference.book',
                        match: '(?<!\\S)@[A-Za-z0-9_-]+',
                        comment: 'Compact @id reference — mirrors AGENT_REFERENCE_AT_PATTERN',
                    },
                    {
                        name: 'entity.name.function.agent-reference.book',
                        match: '\\{[^{}\\r\\n]+\\}',
                        comment: 'Braced reference {Agent Name} — mirrors AGENT_REFERENCE_BRACED_PATTERN',
                    },
                    {
                        name: 'markup.underline.link.book',
                        match: 'https?:\\/\\/[^\\s{}]+',
                        comment: 'URL reference — mirrors AGENT_REFERENCE_URL_PATTERN',
                    },
                ],
            },
            parameter: {
                comment: 'Template parameters inside commitment content',
                patterns: [
                    {
                        name: 'variable.parameter.book',
                        match: '@[a-zA-Z0-9_á-žÁ-Žа-яА-ЯёЁ]+',
                        comment: 'Template @parameterName reference — mirrors parameterRegex in useBookEditorMonacoLanguage',
                    },
                    {
                        name: 'variable.parameter.book',
                        match: '\\{[^}]+\\}',
                        comment: 'Template {parameter} reference',
                    },
                ],
            },
        },
    };
}

/**
 * Generates VSCode snippets from the commitment registry.
 * Each commitment becomes a snippet with the commitment type as prefix.
 */
function createBookSnippets(): Record<string, object> {
    const snippets: Record<string, object> = {};

    for (const commitment of COMMITMENT_REGISTRY) {
        const type = commitment.type;
        const description = commitment.description;
        const icon = commitment.icon;

        snippets[type] = {
            prefix: type,
            body: `${type} \${1:${type.toLowerCase()}}`,
            description: `${icon} ${description}`,
        };
    }

    return snippets;
}

// --- Main generation ---

const tmLanguage = createBookTmLanguage();
const grammarPath = join(EXTENSION_DIR, 'syntaxes', 'book.tmLanguage.json');
writeFileSync(
    grammarPath,
    `${JSON.stringify(
        {
            $comment: GENERATOR_WARNING,
            ...tmLanguage,
        },
        null,
        4,
    )}\n`,
    'utf-8',
);
console.info(`✅ Generated: ${grammarPath}`);

const snippets = createBookSnippets();
const snippetsPath = join(EXTENSION_DIR, 'snippets', 'book.json');
writeFileSync(
    snippetsPath,
    `${JSON.stringify(
        {
            $comment: GENERATOR_WARNING,
            ...snippets,
        },
        null,
        4,
    )}\n`,
    'utf-8',
);
console.info(`✅ Generated: ${snippetsPath}`);
