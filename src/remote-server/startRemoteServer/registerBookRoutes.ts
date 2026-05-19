import type { Request } from 'express';
import { assertsError } from '../../errors/assertsError';
import { serializeError } from '../../errors/utils/serializeError';
import type { paths } from '../openapi-types';
import type { RemoteServerRuntime } from './RemoteServerRuntime';

/**
 * Registers book listing and book source download routes.
 *
 * @private internal utility of `startRemoteServer`
 */
export function registerBookRoutes<TCustomOptions>(runtime: RemoteServerRuntime<TCustomOptions>): void {
    runtime.app.get(`/books`, async (request, response) => {
        if (runtime.configuration.collection === null) {
            response.status(500).send('No collection available');
            return;
        }

        const pipelines = await runtime.configuration.collection.listPipelines();
        // <- TODO: [🧠][👩🏾‍🤝‍🧑🏿] List `inputParameters` required for the execution

        response.send(pipelines satisfies paths['/books']['get']['responses']['200']['content']['application/json']);
    });

    // TODO: [🧠] Is it secure / good idea to expose source codes of hosted books

    runtime.app.get(`/books/*`, async (request, response) => {
        try {
            if (runtime.configuration.collection === null) {
                response.status(500).send('No collection nor books available');
                return;
            }

            const pipelines = await runtime.configuration.collection.listPipelines();
            const pipelineUrl = resolveBookPipelineUrl(request, pipelines);
            const pipeline = await runtime.configuration.collection.getPipelineByUrl(pipelineUrl);
            const source = pipeline.sources[0];

            if (source === undefined || source.type !== 'BOOK') {
                throw new Error('Pipeline source is not a book');
            }

            response
                .type(
                    'text/markdown',
                    // <- TODO: [🧠] Make custom mime-type for books
                )
                .send(source.content as paths[`/books/{bookId}`]['get']['responses']['200']['content']['text/markdown']);
        } catch (error) {
            assertsError(error);

            response
                .status(
                    404,
                    // <- TODO: [👨🏼‍🤝‍👨🏻] Implement and use `errorToHttpStatus`
                )
                .send({ error: serializeError(error) });
        }
    });
}

/**
 * Resolves the requested book URL using either known collection URLs or the full request URL.
 */
function resolveBookPipelineUrl(request: Request, pipelines: ReadonlyArray<string>): string {
    const fullUrl = request.protocol + '://' + request.get('host') + request.originalUrl;
    return pipelines.find((pipelineUrl) => pipelineUrl.endsWith(request.originalUrl)) || fullUrl;
}

