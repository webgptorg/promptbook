import type { ___ } from '../../utils/organization/___';
import type { LlmTemplateJson } from './LlmTemplateJson';
import type { PromptDialogJson } from './PromptDialogJson';
import type { ScriptJson } from './ScriptJson';
import type { SimpleTemplateJson } from './SimpleTemplateJson';
/**
 * Describes one prompt template in the promptbook
 */
export type PromptTemplateJson = LlmTemplateJson | SimpleTemplateJson | ScriptJson | PromptDialogJson | ___ | ___ | ___ | ___;
/**
 * TODO: [🧠][🥜] What is propper name for this - "Template", "Prompt template",...
 * TODO: [🧠][🥜] Reduce confusion of `PromptTemplateJson` vs (`LlmTemplateJson` which is 'PROMPT_TEMPLATE')
 */
