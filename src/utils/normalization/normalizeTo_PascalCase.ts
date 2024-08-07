import { normalizeTo_camelCase } from './normalizeTo_camelCase';

/**
 * Semantic helper for PascalCase strings
 *
 * @example 'HelloWorld'
 * @example 'ILovePromptbook'
 */
export type string_PascalCase = string;

export function normalizeTo_PascalCase(text: string): string_PascalCase {
    return normalizeTo_camelCase(text, true);
}
