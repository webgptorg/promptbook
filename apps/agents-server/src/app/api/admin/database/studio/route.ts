import { serializeError, type StudioBFFRequest } from '@prisma/studio-core/data/bff';
import { NextResponse } from 'next/server';
import {
    $provideDatabaseAdminExecutor,
    type DatabaseAdminExecutor,
    type DatabaseAdminQuery,
} from '../../../../../database/$provideDatabaseAdminExecutor';
import { isUserGlobalAdmin } from '../../../../../utils/isUserGlobalAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Handles Embedded Prisma Studio SQL requests for the configured Agents Server database.
 *
 * @param request - Incoming Studio BFF request.
 * @returns Studio-compatible JSON response.
 */
export async function POST(request: Request): Promise<NextResponse> {
    if (!(await isUserGlobalAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let payload: StudioBFFRequest;

    try {
        payload = (await request.json()) as StudioBFFRequest;
    } catch (error) {
        return NextResponse.json([serializeError(error)], { status: 400 });
    }

    return handleDatabaseAdminStudioRequest($provideDatabaseAdminExecutor(), payload);
}

/**
 * Resolves one Studio BFF payload against the raw database executor.
 *
 * @param executor - Raw SQL executor for the active database backend.
 * @param payload - Studio BFF request payload.
 * @returns Studio-compatible JSON response.
 */
async function handleDatabaseAdminStudioRequest(
    executor: DatabaseAdminExecutor,
    payload: StudioBFFRequest,
): Promise<NextResponse> {
    try {
        switch (payload.procedure) {
            case 'query':
                return NextResponse.json([null, await executor.execute(payload.query as DatabaseAdminQuery)]);

            case 'sequence':
                return handleDatabaseAdminStudioSequence(executor, payload.sequence as readonly [
                    DatabaseAdminQuery,
                    DatabaseAdminQuery,
                ]);

            case 'transaction':
                return NextResponse.json([
                    null,
                    await executor.executeTransaction(payload.queries as ReadonlyArray<DatabaseAdminQuery>),
                ]);

            case 'sql-lint':
                return NextResponse.json([
                    null,
                    await executor.lintSql({
                        schemaVersion: payload.schemaVersion,
                        sql: payload.sql,
                    }),
                ]);

            default:
                return NextResponse.json([serializeError(new Error('Invalid database admin procedure.'))], {
                    status: 400,
                });
        }
    } catch (error) {
        return NextResponse.json([serializeError(error)]);
    }
}

/**
 * Executes a two-step Studio sequence, preserving the response shape expected by the BFF client.
 *
 * @param executor - Raw SQL executor for the active database backend.
 * @param sequence - Exactly two Studio-generated queries.
 * @returns Studio-compatible sequence response.
 */
async function handleDatabaseAdminStudioSequence(
    executor: DatabaseAdminExecutor,
    sequence: readonly [DatabaseAdminQuery, DatabaseAdminQuery],
): Promise<NextResponse> {
    const [firstQuery, secondQuery] = sequence;

    try {
        const firstResult = await executor.execute(firstQuery);

        try {
            const secondResult = await executor.execute(secondQuery);
            return NextResponse.json([
                [null, firstResult],
                [null, secondResult],
            ]);
        } catch (error) {
            return NextResponse.json([
                [null, firstResult],
                [serializeError(error)],
            ]);
        }
    } catch (error) {
        return NextResponse.json([[serializeError(error)]]);
    }
}
