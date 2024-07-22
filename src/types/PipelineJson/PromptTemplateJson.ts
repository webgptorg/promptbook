import type { ___ } from '../typeAliases';
import type { LlmTemplateJson } from './LlmTemplateJson';
import { PromptDialogJson } from './PromptDialogJson';
import type { ScriptJson } from './ScriptJson';
import type { SimpleTemplateJson } from './SimpleTemplateJson';

/**
 * Describes one prompt template in the promptbook
 */
export type PromptTemplateJson =
    | LlmTemplateJson
    | SimpleTemplateJson
    | ScriptJson
    | PromptDialogJson
    | ___
    | ___
    | ___
    | ___;
//  <- | [🩻] + Add the file with this (execution) block type
