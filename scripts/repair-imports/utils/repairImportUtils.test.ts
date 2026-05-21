import {
    addOrganizeImportsTypeUsageWorkarounds,
    parseNamedImportSpecifiers,
    removeOrganizeImportsTypeUsageWorkarounds,
    renderNamedImportStatement,
    resolveImportEntity,
} from './repairImportUtils';

describe('parseNamedImportSpecifiers', () => {
    it('parses inline type modifiers without treating them as part of the entity name', () => {
        expect(parseNamedImportSpecifiers('ChatInputArea, type ChatInputAreaProps', false)).toEqual([
            {
                importedName: 'ChatInputArea',
                renderedName: 'ChatInputArea',
                isType: false,
            },
            {
                importedName: 'ChatInputAreaProps',
                renderedName: 'ChatInputAreaProps',
                isType: true,
            },
        ]);
    });

    it('preserves aliases and top-level type imports', () => {
        expect(parseNamedImportSpecifiers('ToolCallProgressUpdate as ProgressUpdate', true)).toEqual([
            {
                importedName: 'ToolCallProgressUpdate',
                renderedName: 'ToolCallProgressUpdate as ProgressUpdate',
                isType: true,
            },
        ]);
    });
});

describe('resolveImportEntity', () => {
    it('prefers the entity exported from the currently imported module when names are duplicated elsewhere', () => {
        expect(
            resolveImportEntity({
                currentFilePath: 'C:\\repo\\src\\cli\\cli-commands\\agent\\run.test.ts',
                currentImportPath: '../../../../scripts/run-agent-messages/main/runAgentMessages',
                importedName: 'runAgentMessages',
                allEntities: [
                    {
                        filename: 'C:\\repo\\scripts\\run-agent-messages\\main\\runAgentMessages.ts',
                        type: 'function',
                        name: 'runAgentMessages',
                        tags: [],
                        isType: false,
                    },
                    {
                        filename: 'C:\\repo\\scripts\\other\\runAgentMessages.ts',
                        type: 'function',
                        name: 'runAgentMessages',
                        tags: [],
                        isType: false,
                    },
                ],
            }),
        ).toEqual(
            expect.objectContaining({
                filename: 'C:\\repo\\scripts\\run-agent-messages\\main\\runAgentMessages.ts',
            }),
        );
    });

    it('prefers entities from src when a src barrel import collides with a script export of the same name', () => {
        expect(
            resolveImportEntity({
                currentFilePath: 'C:\\repo\\src\\book-2.0\\book-language-documentation\\createStandaloneBookLanguageMarkdown.ts',
                currentImportPath: '../../_packages/core.index',
                importedName: 'BOOK_LANGUAGE_VERSION',
                allEntities: [
                    {
                        filename: 'C:\\repo\\src\\version.ts',
                        type: 'const',
                        name: 'BOOK_LANGUAGE_VERSION',
                        tags: [],
                        isType: false,
                    },
                    {
                        filename: 'C:\\repo\\scripts\\update-version-in-config\\update-version-in-config.ts',
                        type: 'const',
                        name: 'BOOK_LANGUAGE_VERSION',
                        tags: [],
                        isType: false,
                    },
                ],
            }),
        ).toEqual(
            expect.objectContaining({
                filename: 'C:\\repo\\src\\version.ts',
            }),
        );
    });
});

describe('renderNamedImportStatement', () => {
    it('preserves non-type imports when the source specifier was not explicitly marked as type-only', () => {
        expect(
            renderNamedImportStatement({
                importFrom: '../_common/BookTranspiler',
                importedSpecifier: {
                    importedName: 'BookTranspiler',
                    renderedName: 'BookTranspiler',
                    isType: false,
                },
            }),
        ).toBe(`import { BookTranspiler } from '../_common/BookTranspiler';`);
    });

    it('preserves explicit type-only imports', () => {
        expect(
            renderNamedImportStatement({
                importFrom: './FormatCommand',
                importedSpecifier: {
                    importedName: 'FormatCommand',
                    renderedName: 'FormatCommand',
                    isType: true,
                },
            }),
        ).toBe(`import type { FormatCommand } from './FormatCommand';`);
    });
});

describe('organize-imports type usage workarounds', () => {
    it('keeps imported names used by satisfies and as type expressions visible to import organization', () => {
        const fileContent = [
            `import { RuntimeValue } from './RuntimeValue';`,
            `import type { ChatSaveFormatDefinition } from './ChatSaveFormatDefinition';`,
            `import { LlmExecutionToolsConstructor } from './LlmExecutionToolsConstructor';`,
            '',
            `const chatSaveFormatDefinition = {} satisfies ChatSaveFormatDefinition;`,
            `const executionTools = Object.assign({}, {}) as LlmExecutionToolsConstructor;`,
            `RuntimeValue();`,
        ].join('\n');

        const fileContentWithWorkarounds = addOrganizeImportsTypeUsageWorkarounds('example.ts', fileContent);

        expect(fileContentWithWorkarounds).toContain(
            `type __RepairImportsTypeUsage0 = ChatSaveFormatDefinition; // REPAIR_IMPORTS_ORGANIZE_TYPE_USAGE_WORKAROUND`,
        );
        expect(fileContentWithWorkarounds).toContain(
            `type __RepairImportsTypeUsage1 = LlmExecutionToolsConstructor; // REPAIR_IMPORTS_ORGANIZE_TYPE_USAGE_WORKAROUND`,
        );
        expect(fileContentWithWorkarounds).not.toContain(
            `type __RepairImportsTypeUsage2 = RuntimeValue; // REPAIR_IMPORTS_ORGANIZE_TYPE_USAGE_WORKAROUND`,
        );
    });

    it('removes inserted import organization workarounds', () => {
        const fileContent = [
            `import type { ChatPrompt } from './Prompt';`,
            '',
            `const chatPrompt = {} satisfies ChatPrompt;`,
        ].join('\n');
        const fileContentWithWorkarounds = addOrganizeImportsTypeUsageWorkarounds('playground.ts', fileContent);

        expect(removeOrganizeImportsTypeUsageWorkarounds(fileContentWithWorkarounds)).not.toContain(
            'REPAIR_IMPORTS_ORGANIZE_TYPE_USAGE_WORKAROUND',
        );
    });

    it('does not add a workaround for const assertions', () => {
        const fileContent = [`import { RuntimeValue } from './RuntimeValue';`, '', `const value = RuntimeValue() as const;`].join(
            '\n',
        );

        expect(addOrganizeImportsTypeUsageWorkarounds('example.ts', fileContent)).toBe(fileContent);
    });
});

// Note: [⚫] Code for repository script [repairImportUtils.test](scripts/repair-imports/utils/repairImportUtils.test.ts) should never be published in any package
