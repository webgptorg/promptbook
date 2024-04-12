import { normalizeTo_camelCase } from './normalizeTo_camelCase';

export function normalizeTo_PascalCase(sentence: string): string {
    return normalizeTo_camelCase(sentence, true);
}
