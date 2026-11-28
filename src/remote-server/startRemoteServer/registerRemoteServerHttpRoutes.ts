import { registerBookRoutes } from './registerBookRoutes';
import { registerExecutionRoutes } from './registerExecutionRoutes';
import { registerLoginRoute } from './registerLoginRoute';
import { registerNotFoundRoute } from './registerNotFoundRoute';
import { registerOpenAiCompatibleChatCompletionsRoute } from './registerOpenAiCompatibleChatCompletionsRoute';
import { registerOpenApiRoutes } from './registerOpenApiRoutes';
import type { RemoteServerRuntime } from './RemoteServerRuntime';
import { registerServerIndexRoute } from './registerServerIndexRoute';

/**
 * Registers all HTTP middleware and routes in the original order.
 *
 * @private internal utility of `startRemoteServer`
 */
export function registerRemoteServerHttpRoutes<TCustomOptions>(runtime: RemoteServerRuntime<TCustomOptions>): void {
    registerOpenAiCompatibleChatCompletionsRoute(runtime);

    // TODO: [🥺] Expose openapiJson to consumer and also allow to add new routes
    registerOpenApiRoutes(runtime.app);

    registerServerIndexRoute(runtime);
    registerLoginRoute(runtime);
    registerBookRoutes(runtime);
    registerExecutionRoutes(runtime);
    registerNotFoundRoute(runtime.app);
}
