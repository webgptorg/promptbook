import type { NextFunction, Request, Response } from 'express';
import express from 'express';

/**
 * Creates the base express application with shared middleware.
 *
 * @private internal utility of `startRemoteServer`
 */
export function createRemoteServerExpressApp(): express.Express {
    const app = express();

    app.use(express.json());
    app.use(addPoweredByHeader);

    return app;
}

/**
 * Adds Promptbook branding header to each HTTP response.
 */
function addPoweredByHeader(request: Request, response: Response, next: NextFunction): void {
    response.setHeader('X-Powered-By', 'Promptbook engine');
    next();
}

