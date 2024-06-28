import type { KnowledgeJson } from './KnowledgeJson';
import type { PromptbookJson } from './PromptbookJson';
import type { PromptbookLibraryJson } from './PromptbookLibraryJson';

/**
 * JSON file that can contain saved promptbooks, libraries, knowledge,...
 */
export type JsonFile = PromptbookJson & PromptbookLibraryJson & KnowledgeJson;
