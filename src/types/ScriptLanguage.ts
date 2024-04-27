import type { TupleToUnion } from 'type-fest';

/**
 * Supported script languages
 */
export const SUPPORTED_SCRIPT_LANGUAGES = ['javascript', 'typescript', 'python'] as const;

/**
 * Script language
 */
export type ScriptLanguage = TupleToUnion<typeof SUPPORTED_SCRIPT_LANGUAGES>;
