import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getManagementApiCorsHeaders } from './managementApiCors';

/**
 * Stable error code values returned by the management API.
 */
export const MANAGEMENT_API_ERROR_CODES = [
    'authentication_required',
    'forbidden',
    'invalid_request',
    'validation_error',
    'not_found',
    'conflict',
    'server_error',
    'token_owner_missing',
] as const;

/**
 * Stable error code union returned by the management API.
 */
export type ManagementApiErrorCode = (typeof MANAGEMENT_API_ERROR_CODES)[number];

/**
 * Canonical JSON error model returned by the management API.
 */
export const ManagementApiErrorSchema = z.object({
    code: z.enum(MANAGEMENT_API_ERROR_CODES),
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string().optional(),
});

/**
 * Error payload shape returned by the management API.
 */
export type ManagementApiError = z.infer<typeof ManagementApiErrorSchema>;

/**
 * Resolves the request id used in error bodies and response headers.
 *
 * @param request - Incoming request.
 * @returns Request identifier from headers or a generated fallback.
 */
export function getManagementApiRequestId(request: Request): string {
    return request.headers.get('x-request-id') || crypto.randomUUID();
}

/**
 * Creates one JSON response with management CORS and request-id headers applied.
 *
 * @param request - Incoming request.
 * @param body - Serializable payload.
 * @param init - Optional response init fields.
 * @returns JSON response with management headers.
 */
export async function createManagementApiJsonResponse<TBody>(
    request: Request,
    body: TBody,
    init: ResponseInit = {},
    requestId = getManagementApiRequestId(request),
): Promise<NextResponse<TBody>> {
    const corsHeaders = await getManagementApiCorsHeaders(request);
    const response = NextResponse.json(body, init);

    for (const [headerName, headerValue] of Object.entries(corsHeaders)) {
        response.headers.set(headerName, headerValue);
    }

    response.headers.set('X-Request-Id', requestId);
    response.headers.set('Cache-Control', 'no-store, max-age=0');

    return response;
}

/**
 * Creates one standardized JSON error response for the management API.
 *
 * @param request - Incoming request.
 * @param status - HTTP status code.
 * @param code - Stable error code.
 * @param message - Human-friendly message.
 * @param details - Optional extra structured details.
 * @returns JSON error response.
 */
export async function createManagementApiErrorResponse(
    request: Request,
    status: number,
    code: ManagementApiErrorCode,
    message: string,
    details?: unknown,
): Promise<NextResponse<{ error: ManagementApiError }>> {
    const requestId = getManagementApiRequestId(request);
    return createManagementApiJsonResponse(
        request,
        {
            error: {
                code,
                message,
                ...(details === undefined ? {} : { details }),
                requestId,
            },
        },
        { status },
        requestId,
    );
}

/**
 * Builds the shared `OPTIONS` response for management endpoints.
 *
 * @param request - Incoming preflight request.
 * @returns Empty CORS response.
 */
export async function createManagementApiOptionsResponse(request: Request): Promise<NextResponse<null>> {
    return createManagementApiJsonResponse(request, null, { status: 200 });
}

/**
 * Reads and validates one JSON request body using a Zod schema.
 *
 * @param request - Incoming request.
 * @param schema - Body schema.
 * @returns Parsed body result that can be turned into a response by the caller.
 */
export async function parseManagementApiJsonBody<TSchema extends z.ZodTypeAny>(
    request: Request,
    schema: TSchema,
): Promise<
    | {
          success: true;
          data: z.infer<TSchema>;
      }
    | {
          success: false;
          response: NextResponse<{ error: ManagementApiError }>;
      }
> {
    let payload: unknown;

    try {
        payload = await request.json();
    } catch (error) {
        return {
            success: false,
            response: await createManagementApiErrorResponse(
                request,
                400,
                'invalid_request',
                'Invalid JSON payload.',
            ),
        };
    }

    const parsedPayload = schema.safeParse(payload);
    if (!parsedPayload.success) {
        return {
            success: false,
            response: await createManagementApiErrorResponse(
                request,
                400,
                'validation_error',
                'Request payload validation failed.',
                z.treeifyError(parsedPayload.error),
            ),
        };
    }

    return {
        success: true,
        data: parsedPayload.data,
    };
}
