import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { hasLegacyAgentTextTranslation, translateLegacyAgentText } from './translateLegacyAgentText';

/**
 * Matches string literals passed to `formatText(...)`.
 */
const FORMAT_TEXT_LITERAL_PATTERN = /\bformatText\(\s*(['"])((?:\\.|(?!\1)[^\\])*?)\1\s*\)/g;

/**
 * Matches string literals passed to `formatAgentNamingText(...)`.
 */
const FORMAT_AGENT_NAMING_TEXT_LITERAL_PATTERN = /\bformatAgentNamingText\(\s*(['"])((?:\\.|(?!\1)[^\\])*?)\1\s*,/g;

/**
 * Collects all TypeScript source files recursively.
 *
 * @param directoryPath - Starting directory.
 * @returns Absolute file paths under the directory.
 */
function collectTypescriptFiles(directoryPath: string): Array<string> {
    const entries = readdirSync(directoryPath, { withFileTypes: true });
    const nestedFiles = entries.flatMap((entry) => {
        const entryPath = path.join(directoryPath, entry.name);
        if (entry.isDirectory()) {
            return collectTypescriptFiles(entryPath);
        }

        if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
            return [];
        }

        return [entryPath];
    });

    return nestedFiles;
}

/**
 * Collects literal legacy phrases from all supported format helpers.
 *
 * @returns Sorted list of unique literal phrases used in source code.
 */
function collectLegacyFormattedTextLiterals(): Array<string> {
    const sourceRoot = path.resolve(process.cwd(), 'apps/agents-server/src');
    const files = collectTypescriptFiles(sourceRoot);
    const literalSet = new Set<string>();

    for (const filePath of files) {
        const fileContent = readFileSync(filePath, 'utf8');
        const patterns = [FORMAT_TEXT_LITERAL_PATTERN, FORMAT_AGENT_NAMING_TEXT_LITERAL_PATTERN];

        for (const pattern of patterns) {
            pattern.lastIndex = 0;
            let match: RegExpExecArray | null;

            // Iterate all literal usages in the current source file.
            while ((match = pattern.exec(fileContent))) {
                literalSet.add(decodeLiteralText(match[2] || ''));
            }
        }
    }

    return [...literalSet].sort((left, right) => left.localeCompare(right));
}

/**
 * Decodes common escaped sequences captured from TypeScript string literals.
 *
 * @param value - Raw string content captured by regex.
 * @returns Decoded text matching runtime literal values.
 */
function decodeLiteralText(value: string): string {
    return value.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n');
}

describe('translateLegacyAgentText', () => {
    it('translates known literals for Czech language', () => {
        expect(translateLegacyAgentText('Delete agent', 'cs')).toBe('Smazat agenta');
        expect(translateLegacyAgentText('My chats', 'cs')).toBe('Moje chaty');
    });

    it('keeps unknown literals unchanged', () => {
        expect(translateLegacyAgentText('Unknown phrase', 'cs')).toBe('Unknown phrase');
    });

    it('keeps English literals unchanged when active language is not Czech', () => {
        expect(translateLegacyAgentText('Delete agent', 'en')).toBe('Delete agent');
    });
});

describe('legacy phrase translation coverage', () => {
    it('covers all literal formatText(...) and formatAgentNamingText(...) phrases in agents server', () => {
        const literals = collectLegacyFormattedTextLiterals();
        const missingTranslations = literals.filter((literal) => !hasLegacyAgentTextTranslation(literal));

        expect(missingTranslations).toEqual([]);
    });
});
