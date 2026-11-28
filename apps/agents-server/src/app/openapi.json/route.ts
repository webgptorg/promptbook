import { $provideServer } from '@/src/tools/$provideServer';
import { createManagementOpenApiDocument } from '@/src/utils/managementApi/managementApiOpenApi';
import {
    createManagementApiJsonResponse,
    createManagementApiOptionsResponse,
} from '@/src/utils/managementApi/managementApiResponses';

/**
 * Handles CORS preflight requests for `GET /openapi.json`.
 *
 * @param request - Incoming preflight request.
 * @returns Empty CORS response.
 */
export async function OPTIONS(request: Request) {
    return createManagementApiOptionsResponse(request);
}

/**
 * Returns the runtime-generated OpenAPI 3.1 document for the management API.
 *
 * @param request - Incoming OpenAPI request.
 * @returns OpenAPI JSON document.
 */
export async function GET(request: Request) {
    const { publicUrl } = await $provideServer();
    const document = createManagementOpenApiDocument(publicUrl.origin);

    return createManagementApiJsonResponse(request, document);
}
