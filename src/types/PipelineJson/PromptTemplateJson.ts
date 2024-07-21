import type { LlmTemplateJson } from './LlmTemplateJson';
import type { PromptDialogJson } from './PromptDialogJson';
import type { ScriptJson } from './ScriptJson';
import type { SimpleTemplateJson } from './SimpleTemplateJson';

/**
 * Describes one prompt template in the promptbook
 */
export type PromptTemplateJson = LlmTemplateJson | SimpleTemplateJson | ScriptJson | PromptDialogJson;
