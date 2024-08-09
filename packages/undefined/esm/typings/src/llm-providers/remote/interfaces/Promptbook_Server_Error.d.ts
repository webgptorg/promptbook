/**
 * Socket.io error for remote text generation
 *
 * This is sent from server to client when error occurs and stops the process
 */
export interface Promptbook_Server_Error {
    /**
     * The error message which caused the error
     */
    readonly errorMessage: string;
}
