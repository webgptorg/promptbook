import type { TupleToUnion } from 'type-fest';
/**
 * Supported script languages
 */
export declare const SUPPORTED_SCRIPT_LANGUAGES: readonly ["javascript", "typescript", "python"];
/**
 * Script language
 */
export type ScriptLanguage = TupleToUnion<typeof SUPPORTED_SCRIPT_LANGUAGES>;
