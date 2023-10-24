import { uuid } from '../../../../.././types/typeAliases';
import { Prompt } from '../../../../../types/Prompt';

export interface Ptps_Request {
    readonly clientId: uuid;
    readonly prompt: Prompt;
}
