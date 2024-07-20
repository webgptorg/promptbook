import { LlmTemplateJson } from './LlmTemplateJson';
import { PromptDialogJson } from './PromptDialogJson';
import { ScriptJson } from './ScriptJson';
import { SimpleTemplateJson } from './SimpleTemplateJson';

/**
 * Describes one prompt template in the promptbook
 */
export type PromptTemplateJson = LlmTemplateJson | SimpleTemplateJson | ScriptJson | PromptDialogJson;
