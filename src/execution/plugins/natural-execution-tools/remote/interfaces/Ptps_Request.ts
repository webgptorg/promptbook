import { uuid } from '../../../../.././types/typeAliases';
import { Prompt } from '../../../../../types/Prompt';

/**
 * Socket.io progress for remote text generation
 *
 * This is a request from client to server
 */
export interface Ptps_Request {
    /**
     * Client responsible for the requests
     */
    readonly clientId: uuid;

    /**
     * The Prompt to execute
     */
    readonly prompt: Prompt;
}
