import type { ErrorJson } from '../../../errors/utils/ErrorJson';

/**
 * This is sent from server to client when error occurs and stops the process
 *
 * @private internal type of remote server
 */
export type PromptbookServer_Error = ErrorJson;
