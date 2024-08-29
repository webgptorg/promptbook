import type { ___ } from '../../utils/organization/___';
import type { LlmTemplateJson } from './LlmTemplateJson';
import type { PromptDialogJson } from './PromptDialogJson';
import type { ScriptJson } from './ScriptJson';
import type { SimpleTemplateJson } from './SimpleTemplateJson';

/**
 * Describes one (prompt) template in the promptbook
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type TemplateJson =
    | LlmTemplateJson
    | SimpleTemplateJson
    | ScriptJson
    | PromptDialogJson
    | ___
    | ___
    | ___
    | ___;
//  <- | [🅱] + Add the file with this (execution) block type

