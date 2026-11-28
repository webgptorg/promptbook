import type { ___or___ } from '../../utils/organization/___or___';
import type { DialogTaskJson } from './DialogTaskJson';
import type { PromptTaskJson } from './PromptTaskJson';
import type { ScriptTaskJson } from './ScriptTaskJson';
import type { SimpleTaskJson } from './SimpleTaskJson';

/**
 * Describes one (prompt) task in the pipeline
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type TaskJson = PromptTaskJson | SimpleTaskJson | ScriptTaskJson | DialogTaskJson | ___or___ | ___or___;
//  <- | [🅱] + Add the file with this (execution) block type
