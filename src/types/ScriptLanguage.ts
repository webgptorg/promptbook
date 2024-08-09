import type { TupleToUnion } from 'type-fest';

/**
 * Script language
 */
export type ScriptLanguage = TupleToUnion<typeof SUPPORTED_SCRIPT_LANGUAGES>;

/**
 * Supported script languages
 *
 * @private internal base for `ScriptLanguage`
 */
export const SUPPORTED_SCRIPT_LANGUAGES = ['javascript', 'typescript', 'python'] as const;
