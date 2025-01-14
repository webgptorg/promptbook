import type { TaskProgress } from '../../../types/TaskProgress';

/**
 * This is sent from server to client as indication of prograss arbitrarily and may be sent multiple times
 *
 * @private internal type of remote server
 */
export type PromptbookServer_Progress = TaskProgress;

/**
 * TODO: `PromptbookServer_Progress` is unused for now, but it will be used in the future
 */
