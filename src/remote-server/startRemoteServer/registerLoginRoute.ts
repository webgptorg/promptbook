import { assertsError } from '../../errors/assertsError';
import { AuthenticationError } from '../../errors/AuthenticationError';
import { serializeError } from '../../errors/utils/serializeError';
import type { chococake } from '../../utils/organization/really_any';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { LoginResponse } from '../types/RemoteServerOptions';
import type { RemoteServerRuntime } from './RemoteServerRuntime';

/**
 * Registers the application-mode login endpoint.
 *
 * @private internal utility of `startRemoteServer`
 */
export function registerLoginRoute<TCustomOptions>(runtime: RemoteServerRuntime<TCustomOptions>): void {
    runtime.app.post(`/login`, async (request, response) => {
        if (!runtime.configuration.isApplicationModeAllowed || runtime.configuration.login === null) {
            response.status(400).send('Application mode is not allowed');
            return;
        }

        try {
            const username = request.body.username;
            const password = request.body.password;
            const appId = request.body.appId;

            const { isSuccess, error, message, identification } = await runtime.configuration.login({
                username,
                password,
                appId,
                rawRequest: request,
                rawResponse: response,
            });
            response.status(201).send({
                isSuccess,
                message,
                error: error ? (serializeError(error) as TODO_any) : undefined,
                identification,
            } satisfies LoginResponse<chococake>);
            return;
        } catch (error) {
            assertsError(error);

            if (error instanceof AuthenticationError) {
                response.status(401).send({
                    isSuccess: false,
                    message: error.message,
                    error: serializeError(error) as TODO_any,
                } satisfies LoginResponse<chococake>);
            }

            console.warn(`Login function thrown different error than AuthenticationError`, {
                error,
                serializedError: serializeError(error),
            });
            response.status(400).send({ error: serializeError(error) });
        }
    });
}
