import type { TaskProgress } from '../../types/TaskProgress';

/**
 * This is sent from server to client as indication of prograss arbitrarily and may be sent multiple times
 */
export type PromptbookServer_Progress = TaskProgress;
