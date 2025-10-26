/** @jest-environment jsdom */

import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react';
import { string_book } from '../../book-2.0/agent-source/string_book';
import { BookEditorMonaco } from './BookEditorMonaco';

// Mock the monaco editor
const mockSetMonarchTokensProvider = jest.fn();
const mockDispose = jest.fn();
mockSetMonarchTokensProvider.mockReturnValue({ dispose: mockDispose });

jest.mock('@monaco-editor/react', () => ({
    __esModule: true,
    Editor: (props: { [key: string]: unknown }) => <div data-testid="mock-editor">{JSON.stringify(props)}</div>,
    useMonaco: () => ({
        languages: {
            register: jest.fn(),
            setMonarchTokensProvider: mockSetMonarchTokensProvider,
            registerCompletionItemProvider: jest.fn(() => ({ dispose: jest.fn() })),
        },
        editor: {
            defineTheme: jest.fn(),
            setTheme: jest.fn(),
        },
    }),
}));

// Mock other dependencies
jest.mock('../../book-2.0/commitments', () => ({
    getAllCommitmentDefinitions: () => [{ type: 'ASK' }, { type: 'TELL' }, { type: 'META' }],
}));

jest.mock('../../config', () => ({
    PROMPTBOOK_SYNTAX_COLORS: {
        TITLE: { toHex: () => '#000000' },
        COMMITMENT: { toHex: () => '#000000' },
        PARAMETER: { toHex: () => '#000000' },
    },
}));

describe('BookEditorMonaco', () => {
    it('should use a regex that supports international characters for parameters', () => {
        render(<BookEditorMonaco value={'' as string_book} isReadonly={false} />);

        expect(mockSetMonarchTokensProvider).toHaveBeenCalled();

        const monarchTokensProvider = mockSetMonarchTokensProvider.mock.calls[0][1] as {
            tokenizer: { body: [RegExp, string][] };
        };
        const bookRules = monarchTokensProvider.tokenizer.body;

        const parameterRule = bookRules.find((rule) => rule[1] === 'parameter');
        expect(parameterRule).toBeDefined();

        const parameterRegex = parameterRule![0];
        expect(parameterRegex).toBeInstanceOf(RegExp);

        // Test the regex with various strings
        const textWithParams = 'Tohle je @Slovník a také @мир.';
        const matches = textWithParams.match(new RegExp(parameterRegex.source, 'g'));
        expect(matches).toEqual(['@Slovník', '@мир']);

        expect('@Slovník'.match(parameterRegex)?.[0]).toBe('@Slovník');
        expect('@мир'.match(parameterRegex)?.[0]).toBe('@мир');
        expect('@parameter123'.match(parameterRegex)?.[0]).toBe('@parameter123');
        expect('@onlyAscii'.match(parameterRegex)?.[0]).toBe('@onlyAscii');
        expect('not a parameter'.match(parameterRegex)).toBeNull();
    });
});
