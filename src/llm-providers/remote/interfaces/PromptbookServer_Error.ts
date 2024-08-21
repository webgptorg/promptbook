import type { ErrorJson } from '../../../errors/utils/ErrorJson';

/**
 * Socket.io error for remote text generation
 *
 * This is sent from server to client when error occurs and stops the process
 */
export type PromptbookServer_Error = ErrorJson;
