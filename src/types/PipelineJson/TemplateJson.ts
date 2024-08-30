import type { ___or___ } from '../../utils/organization/___or___';
import type { DialogTemplateJson } from './DialogTemplateJson';
import type { PromptTemplateJson } from './PromptTemplateJson';
import type { ScriptTemplateJson } from './ScriptTemplateJson';
import type { SimpleTemplateJson } from './SimpleTemplateJson';

/**
 * Describes one (prompt) template in the promptbook
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type TemplateJson =
    | PromptTemplateJson
    | SimpleTemplateJson
    | ScriptTemplateJson
    | DialogTemplateJson
    | ___or___
    | ___or___;
//  <- | [🅱] + Add the file with this (execution) block type
