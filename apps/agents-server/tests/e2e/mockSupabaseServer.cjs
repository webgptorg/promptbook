const http = require('http');
const { URL } = require('url');

/**
 * Port used by the mocked Supabase HTTP API.
 */
const PORT = Number(process.env.E2E_SUPABASE_PORT || 54321);

/**
 * Host used by the mocked Supabase HTTP API.
 */
const HOST = '127.0.0.1';

/**
 * Prefix used by PostgREST endpoints exposed by Supabase.
 */
const REST_PREFIX = '/rest/v1/';

/**
 * PostgREST object media type used by `.single()` and `.maybeSingle()`.
 */
const OBJECT_ACCEPT_HEADER = 'application/vnd.pgrst.object+json';

/**
 * In-memory table store used by the mocked Supabase API.
 */
const tables = new Map([
    ['Metadata', []],
    ['Agent', []],
    ['AgentFolder', []],
    ['User', []],
    ['ApiTokens', []],
    ['UserMemory', []],
]);

/**
 * Sends a JSON response with a stable content type.
 *
 * @param {import('http').ServerResponse} response
 * @param {number} statusCode
 * @param {unknown} body
 */
function sendJson(response, statusCode, body) {
    response.writeHead(statusCode, {
        'content-type': 'application/json; charset=utf-8',
    });
    response.end(JSON.stringify(body));
}

/**
 * Returns rows for a table, creating the table bucket if needed.
 *
 * @param {string} tableName
 * @returns {Array<Record<string, unknown>>}
 */
function getTableRows(tableName) {
    if (!tables.has(tableName)) {
        tables.set(tableName, []);
    }

    return tables.get(tableName);
}

/**
 * Parses a PostgREST token into a primitive JavaScript value.
 *
 * @param {string} rawValue
 * @returns {string | number | boolean | null}
 */
function parseTokenValue(rawValue) {
    const decoded = decodeURIComponent(rawValue);

    if (decoded === 'null') {
        return null;
    }
    if (decoded === 'true') {
        return true;
    }
    if (decoded === 'false') {
        return false;
    }
    if (/^-?\d+(\.\d+)?$/.test(decoded)) {
        return Number(decoded);
    }

    return decoded;
}

/**
 * Parses PostgREST `in.(...)` payload into an array of values.
 *
 * @param {string} clause
 * @returns {Array<string | number | boolean | null>}
 */
function parseInClause(clause) {
    const match = /^in\.\((.*)\)$/.exec(clause);
    if (!match) {
        return [];
    }

    const values = match[1]
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .map((value) => parseTokenValue(value));
    return values;
}

/**
 * Resolves the final row payload based on `select` and `order` query params.
 *
 * @param {Array<Record<string, unknown>>} rows
 * @param {URLSearchParams} searchParams
 * @returns {Array<Record<string, unknown>>}
 */
function applyProjectionAndOrdering(rows, searchParams) {
    let projectedRows = rows;

    const orderClause = searchParams.get('order');
    if (orderClause) {
        const [columnName] = orderClause.split('.');
        projectedRows = [...projectedRows].sort((leftRow, rightRow) => {
            const leftValue = leftRow[columnName];
            const rightValue = rightRow[columnName];
            return String(leftValue ?? '').localeCompare(String(rightValue ?? ''));
        });
    }

    const limitClause = searchParams.get('limit');
    if (limitClause) {
        const limit = Number(limitClause);
        if (Number.isFinite(limit) && limit >= 0) {
            projectedRows = projectedRows.slice(0, limit);
        }
    }

    const selectClause = searchParams.get('select');
    if (!selectClause || selectClause === '*') {
        return projectedRows;
    }

    const selectedColumns = selectClause
        .split(',')
        .map((column) => column.trim())
        .filter((column) => column.length > 0);

    return projectedRows.map((row) => {
        const nextRow = {};
        for (const column of selectedColumns) {
            nextRow[column] = row[column];
        }
        return nextRow;
    });
}

/**
 * Evaluates PostgREST-style filters from query params against a row.
 *
 * @param {Record<string, unknown>} row
 * @param {URLSearchParams} searchParams
 * @returns {boolean}
 */
function matchesRowFilters(row, searchParams) {
    for (const [columnName, rawClause] of searchParams.entries()) {
        if (
            columnName === 'select' ||
            columnName === 'order' ||
            columnName === 'limit' ||
            columnName === 'offset'
        ) {
            continue;
        }

        if (rawClause.startsWith('eq.')) {
            const expectedValue = parseTokenValue(rawClause.slice('eq.'.length));
            if (row[columnName] !== expectedValue) {
                return false;
            }
            continue;
        }

        if (rawClause.startsWith('is.')) {
            const expectedValue = parseTokenValue(rawClause.slice('is.'.length));
            if (expectedValue === null) {
                if (row[columnName] !== null && row[columnName] !== undefined) {
                    return false;
                }
            } else if (row[columnName] !== expectedValue) {
                return false;
            }
            continue;
        }

        if (rawClause.startsWith('not.eq.')) {
            const expectedValue = parseTokenValue(rawClause.slice('not.eq.'.length));
            if (row[columnName] === expectedValue) {
                return false;
            }
            continue;
        }

        if (rawClause.startsWith('not.is.')) {
            const expectedValue = parseTokenValue(rawClause.slice('not.is.'.length));
            if (expectedValue === null) {
                if (row[columnName] === null || row[columnName] === undefined) {
                    return false;
                }
            } else if (row[columnName] === expectedValue) {
                return false;
            }
            continue;
        }

        if (rawClause.startsWith('in.(')) {
            const allowedValues = parseInClause(rawClause);
            if (!allowedValues.some((value) => row[columnName] === value)) {
                return false;
            }
            continue;
        }
    }

    return true;
}

/**
 * Sends the response expected by PostgREST when object mode is requested.
 *
 * @param {import('http').ServerResponse} response
 * @param {Array<Record<string, unknown>>} rows
 */
function sendObjectModeResponse(response, rows) {
    if (rows.length === 1) {
        sendJson(response, 200, rows[0]);
        return;
    }

    sendJson(response, 406, {
        code: 'PGRST116',
        details: `The result contains ${rows.length} rows`,
        hint: null,
        message: 'JSON object requested, multiple (or no) rows returned',
    });
}

/**
 * Parses a JSON request body.
 *
 * @param {import('http').IncomingMessage} request
 * @returns {Promise<unknown>}
 */
function parseJsonBody(request) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        request.on('data', (chunk) => chunks.push(chunk));
        request.on('end', () => {
            if (chunks.length === 0) {
                resolve(null);
                return;
            }

            try {
                const parsed = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
                resolve(parsed);
            } catch (error) {
                reject(error);
            }
        });
        request.on('error', reject);
    });
}

/**
 * Applies a partial update to rows that match the current filter.
 *
 * @param {Array<Record<string, unknown>>} tableRows
 * @param {URLSearchParams} searchParams
 * @param {Record<string, unknown>} patch
 * @returns {Array<Record<string, unknown>>}
 */
function applyUpdate(tableRows, searchParams, patch) {
    const updatedRows = [];
    for (const row of tableRows) {
        if (!matchesRowFilters(row, searchParams)) {
            continue;
        }

        Object.assign(row, patch);
        updatedRows.push({ ...row });
    }

    return updatedRows;
}

/**
 * Handles PostgREST operations for the provided request.
 *
 * @param {import('http').IncomingMessage} request
 * @param {import('http').ServerResponse} response
 * @param {URL} requestUrl
 * @returns {Promise<void>}
 */
async function handleRestRequest(request, response, requestUrl) {
    const tableName = decodeURIComponent(requestUrl.pathname.slice(REST_PREFIX.length));
    const tableRows = getTableRows(tableName);
    const acceptsObject = (request.headers.accept || '').includes(OBJECT_ACCEPT_HEADER);
    const method = request.method || 'GET';

    if (method === 'GET' || method === 'HEAD') {
        const filteredRows = tableRows.filter((row) => matchesRowFilters(row, requestUrl.searchParams));
        const responseRows = applyProjectionAndOrdering(filteredRows, requestUrl.searchParams);

        if (acceptsObject) {
            sendObjectModeResponse(response, responseRows);
        } else {
            sendJson(response, 200, responseRows);
        }
        return;
    }

    if (method === 'POST') {
        const body = await parseJsonBody(request);
        const payloadRows = Array.isArray(body) ? body : body ? [body] : [];
        const insertedRows = payloadRows.map((payloadRow) => ({ ...payloadRow }));
        tableRows.push(...insertedRows);

        const responseRows = applyProjectionAndOrdering(insertedRows, requestUrl.searchParams);
        if (acceptsObject) {
            sendObjectModeResponse(response, responseRows);
        } else {
            sendJson(response, 201, responseRows);
        }
        return;
    }

    if (method === 'PATCH') {
        const body = await parseJsonBody(request);
        const patch = body && typeof body === 'object' ? body : {};
        const updatedRows = applyUpdate(tableRows, requestUrl.searchParams, patch);
        const responseRows = applyProjectionAndOrdering(updatedRows, requestUrl.searchParams);

        if (acceptsObject) {
            sendObjectModeResponse(response, responseRows);
        } else {
            sendJson(response, 200, responseRows);
        }
        return;
    }

    if (method === 'DELETE') {
        const remainingRows = [];
        const deletedRows = [];

        for (const row of tableRows) {
            if (matchesRowFilters(row, requestUrl.searchParams)) {
                deletedRows.push({ ...row });
            } else {
                remainingRows.push(row);
            }
        }

        tables.set(tableName, remainingRows);
        const responseRows = applyProjectionAndOrdering(deletedRows, requestUrl.searchParams);

        if (acceptsObject) {
            sendObjectModeResponse(response, responseRows);
        } else {
            sendJson(response, 200, responseRows);
        }
        return;
    }

    sendJson(response, 405, { error: `Method ${method} is not supported by the Supabase mock server` });
}

/**
 * Creates the mocked Supabase HTTP server instance.
 *
 * @returns {import('http').Server}
 */
function createMockSupabaseServer() {
    return http.createServer(async (request, response) => {
        const method = request.method || 'GET';
        const requestUrl = new URL(request.url || '/', `http://${HOST}:${PORT}`);

        response.setHeader('access-control-allow-origin', '*');
        response.setHeader('access-control-allow-methods', 'GET,POST,PATCH,DELETE,OPTIONS');
        response.setHeader('access-control-allow-headers', 'content-type,authorization,apikey,prefer');

        if (method === 'OPTIONS') {
            response.writeHead(204);
            response.end();
            return;
        }

        if (requestUrl.pathname === '/health') {
            sendJson(response, 200, { ok: true });
            return;
        }

        if (requestUrl.pathname.startsWith(REST_PREFIX)) {
            try {
                await handleRestRequest(request, response, requestUrl);
            } catch (error) {
                sendJson(response, 500, {
                    error: error instanceof Error ? error.message : 'Unexpected mock server error',
                });
            }
            return;
        }

        sendJson(response, 404, { error: `Unknown mock route: ${requestUrl.pathname}` });
    });
}

/**
 * Bootstraps the mocked Supabase API process.
 */
function main() {
    const server = createMockSupabaseServer();
    server.listen(PORT, HOST, () => {
        // eslint-disable-next-line no-console
        console.log(`[mock-supabase] listening on http://${HOST}:${PORT}`);
    });

    const shutdown = () => {
        server.close(() => {
            process.exit(0);
        });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main();
