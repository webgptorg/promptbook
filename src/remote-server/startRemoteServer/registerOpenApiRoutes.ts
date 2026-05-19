import type express from 'express';
import * as OpenApiValidator from 'express-openapi-validator';
import swaggerUi from 'swagger-ui-express';
import { openapiJson } from '../openapi';
import type { TODO_any } from '../../utils/organization/TODO_any';

/**
 * Registers OpenAPI validation, docs, and the raw specification route.
 *
 * @private internal utility of `startRemoteServer`
 */
export function registerOpenApiRoutes(app: express.Express): void {
    app.use(
        OpenApiValidator.middleware({
            apiSpec: openapiJson as TODO_any,

            ignorePaths(path: string) {
                return path.startsWith('/api-docs') || path.startsWith('/swagger') || path.startsWith('/openapi');
            },
            validateRequests: true,
            validateResponses: true,
        }),
    );

    app.use(
        [`/api-docs`, `/swagger`],
        swaggerUi.serve,
        swaggerUi.setup(openapiJson, {
            // customCss: '.swagger-ui .topbar { display: none }',
            // customSiteTitle: 'BRJ API',
            // customfavIcon: 'https://brj.app/favicon.ico',
        }),
    );

    app.get(`/openapi`, (request, response) => {
        response.json(openapiJson);
    });
}

