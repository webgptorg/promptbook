/**
 * Status for a prompt section parsed from checklist markers.
 *
 * - `done` — `[x]`, the prompt was implemented, verified and committed
 * - `failed` — `[!]`, the prompt could not be implemented
 * - `in-progress` — `[^]`, the implementation has started but has not finished yet
 * - `todo` — `[ ]`, the prompt is waiting to be picked up
 * - `not-ready` — `[-]`, the prompt is not ready to be picked up at all
 */
export type PromptStatus = 'done' | 'failed' | 'in-progress' | 'todo' | 'not-ready';
