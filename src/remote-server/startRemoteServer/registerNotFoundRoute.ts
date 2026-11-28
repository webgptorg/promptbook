import type express from 'express';

/**
 * Registers the catch-all 404 handler.
 *
 * @private internal utility of `startRemoteServer`
 */
export function registerNotFoundRoute(app: express.Express): void {
    /**
     * Catch-all handler for unmatched routes
     */
    app.use((request, response) => {
        response.status(404).send(`URL "${request.originalUrl}" was not found on Promptbook server.`);
    });
}
