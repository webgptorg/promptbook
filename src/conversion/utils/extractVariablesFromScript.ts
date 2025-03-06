import spaceTrim from 'spacetrim';
import { ParseError } from '../../errors/ParseError';
import type { string_javascript, string_typescript } from '../../types/typeAliases';

/**
 * Extract all used variable names from ginen JavaScript/TypeScript script
 *
 * @param script JavaScript/TypeScript script
 * @returns Set of variable names
 * @throws {ParseError} if the script is invalid
 * @public exported from `@promptbook/utils` <- Note: [👖] This is usable elsewhere than in Promptbook, so keeping in utils
 */
export function extractVariablesFromScript(script: string_javascript | string_typescript): Set<string> {
    if (script.trim() === '') {
        return new Set<string>();
    }

    const variables = new Set<string>();

    // JS keywords and builtins to exclude
    const exclude = new Set([
        // Keywords
        'break',
        'case',
        'catch',
        'class',
        'const',
        'continue',
        'debugger',
        'default',
        'delete',
        'do',
        'else',
        'export',
        'extends',
        'false',
        'finally',
        'for',
        'function',
        'if',
        'import',
        'in',
        'instanceof',
        'let',
        'new',
        'null',
        'return',
        'super',
        'switch',
        'this',
        'throw',
        'true',
        'try',
        'typeof',
        'var',
        'void',
        'while',
        'with',
        'yield',
        // Common globals
        'console',
        'JSON',
        'Error',

        // Typescript types
        'string',
        'number',
        'boolean',
        'object',
        'symbol',

        // Common methods on built-in objects
        'test',
        'match',
        'exec',
        'replace',
        'search',
        'split',
    ]);

    try {
        // Note: Extract variables from template literals like ${variable}
        const templateRegex = /\$\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}/g;
        let match;
        while ((match = templateRegex.exec(script)) !== null) {
            const varName = match[1]!;
            if (!exclude.has(varName)) {
                variables.add(varName);
            }
        }

        // Note: Process the script to handle normal variable usage
        const processedScript = script
            .replace(/'(?:\\.|[^'\\])*'/g, "''") // <- Note: Remove string literals
            .replace(/"(?:\\.|[^"\\])*"/g, '""')
            .replace(/`(?:\\.|[^`\\])*`/g, '``')
            .replace(/\/(?:\\.|[^/\\])*\/[gimsuy]*/g, '{}'); // <- Note: Remove regex literals

        // Note: Find identifiers in function arguments
        const funcArgRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
        const funcNames = new Set<string>();
        while ((match = funcArgRegex.exec(processedScript)) !== null) {
            funcNames.add(match[1]!);
        }

        // Find variable declarations to exclude them
        const declaredVars = new Set<string>();
        const declRegex = /\b(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
        while ((match = declRegex.exec(processedScript)) !== null) {
            declaredVars.add(match[2]!);
        }

        // Note: Find identifiers in the script
        const identifierRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
        while ((match = identifierRegex.exec(processedScript)) !== null) {
            const name = match[1]!;
            // Add if not excluded, not a function name, and not a declared variable
            if (!exclude.has(name) && !funcNames.has(name) && !declaredVars.has(name)) {
                variables.add(name);
            }
        }
    } catch (error) {
        if (!(error instanceof Error)) {
            throw error;
        }

        throw new ParseError(
            spaceTrim(
                (block) => `
                    Can not extract variables from the script
                    ${block((error as Error).stack || (error as Error).message)}

                    Found variables:
                    ${Array.from(variables)
                        .map((variableName, i) => `${i + 1}) ${variableName}`)
                        .join('\n')}


                    The script:

                    \`\`\`javascript
                    ${block(script)}
                    \`\`\`
                `,
                // <- TODO: [🚞] Pass from consumer(s) of `extractVariablesFromScript`
            ),
        );
    }

    return variables;
}

/**
 * TODO: [🔣] Support for multiple languages - python, java,...
 */
