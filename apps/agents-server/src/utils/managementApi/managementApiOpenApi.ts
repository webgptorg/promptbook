import { z } from 'zod';
import {
    ManagementAgentCreateRequestSchema,
    MANAGEMENT_API_EXAMPLES,
    ManagementAgentDetailSchema,
    ManagementAgentListQueryOpenApiSchema,
    ManagementAgentListResponseSchema,
    ManagementAgentMutationResponseSchema,
    ManagementAgentPathParamsSchema,
    ManagementAgentUpdateRequestOpenApiSchema,
    ManagementDeletionResponseSchema,
    ManagementErrorEnvelopeSchema,
    ManagementFolderAgentPathParamsOpenApiSchema,
    ManagementFolderCreateRequestSchema,
    ManagementFolderListResponseSchema,
    ManagementFolderMoveAgentResponseSchema,
    ManagementFolderMutationResponseSchema,
    ManagementFolderPathParamsOpenApiSchema,
    ManagementFolderUpdateRequestOpenApiSchema,
    ManagementInstanceResponseSchema,
    ManagementMeResponseSchema,
} from './managementApiSchemas';

/**
 * Zod object schema shape accepted for path and query parameter generation.
 */
type ManagementOpenApiObjectSchema = z.ZodObject<z.ZodRawShape>;

/**
 * One response entry used by the generated OpenAPI document.
 */
type ManagementOpenApiResponseDefinition = {
    /**
     * Human-friendly response description.
     */
    description: string;
    /**
     * Zod schema describing the JSON payload.
     */
    schema: z.ZodTypeAny;
    /**
     * Optional example payload rendered in Swagger UI.
     */
    example?: unknown;
};

/**
 * One operation entry used to generate the OpenAPI path item.
 */
type ManagementOpenApiOperationDefinition = {
    /**
     * Short operation summary.
     */
    summary: string;
    /**
     * Optional longer operation description.
     */
    description?: string;
    /**
     * Tags shown in Swagger UI.
     */
    tags: string[];
    /**
     * Optional path parameter schema.
     */
    pathParams?: ManagementOpenApiObjectSchema;
    /**
     * Optional query parameter schema.
     */
    query?: ManagementOpenApiObjectSchema;
    /**
     * Optional request body schema.
     */
    requestBody?: z.ZodTypeAny;
    /**
     * Optional request example.
     */
    requestExample?: unknown;
    /**
     * Whether this operation requires bearer authentication.
     */
    requiresAuth?: boolean;
    /**
     * Response definitions keyed by HTTP status code.
     */
    responses: Record<string, ManagementOpenApiResponseDefinition>;
};

/**
 * Source-of-truth registry for the management API surface.
 */
const MANAGEMENT_OPENAPI_ROUTES: Record<string, Partial<Record<'get' | 'post' | 'patch' | 'delete', ManagementOpenApiOperationDefinition>>> =
    {
        '/api/v1/agents': {
            get: {
                summary: 'List agents',
                description:
                    'Returns agents visible to the authenticated API key owner. Supports pagination, search, and stable sorting.',
                tags: ['Agents'],
                query: ManagementAgentListQueryOpenApiSchema,
                requiresAuth: true,
                responses: {
                    '200': {
                        description: 'Paged list of owned agents.',
                        schema: ManagementAgentListResponseSchema,
                        example: MANAGEMENT_API_EXAMPLES.agentListResponse,
                    },
                    '401': {
                        description: 'Missing or invalid API key.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                },
            },
            post: {
                summary: 'Create agent',
                tags: ['Agents'],
                requestBody: ManagementAgentCreateRequestSchema,
                requestExample: MANAGEMENT_API_EXAMPLES.createAgentRequest,
                requiresAuth: true,
                responses: {
                    '201': {
                        description: 'Created agent detail.',
                        schema: ManagementAgentMutationResponseSchema,
                        example: { agent: MANAGEMENT_API_EXAMPLES.agentDetail },
                    },
                    '400': {
                        description: 'Invalid payload.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                    '401': {
                        description: 'Missing or invalid API key.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                },
            },
        },
        '/api/v1/agents/{agentId}': {
            get: {
                summary: 'Get agent detail',
                tags: ['Agents'],
                pathParams: ManagementAgentPathParamsSchema,
                requiresAuth: true,
                responses: {
                    '200': {
                        description: 'Owned agent detail.',
                        schema: ManagementAgentDetailSchema,
                        example: MANAGEMENT_API_EXAMPLES.agentDetail,
                    },
                    '401': {
                        description: 'Missing or invalid API key.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                    '404': {
                        description: 'Agent not found.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                },
            },
            patch: {
                summary: 'Update agent',
                tags: ['Agents'],
                pathParams: ManagementAgentPathParamsSchema,
                requestBody: ManagementAgentUpdateRequestOpenApiSchema,
                requestExample: MANAGEMENT_API_EXAMPLES.updateAgentRequest,
                requiresAuth: true,
                responses: {
                    '200': {
                        description: 'Updated agent detail.',
                        schema: ManagementAgentMutationResponseSchema,
                        example: { agent: MANAGEMENT_API_EXAMPLES.agentDetail },
                    },
                    '400': {
                        description: 'Invalid payload.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                    '401': {
                        description: 'Missing or invalid API key.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                    '404': {
                        description: 'Agent not found.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                },
            },
            delete: {
                summary: 'Delete agent',
                tags: ['Agents'],
                pathParams: ManagementAgentPathParamsSchema,
                requiresAuth: true,
                responses: {
                    '200': {
                        description: 'Deletion confirmation.',
                        schema: ManagementDeletionResponseSchema,
                        example: { success: true },
                    },
                    '401': {
                        description: 'Missing or invalid API key.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                    '404': {
                        description: 'Agent not found.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                },
            },
        },
        '/api/v1/folders': {
            get: {
                summary: 'List folders',
                tags: ['Folders'],
                requiresAuth: true,
                responses: {
                    '200': {
                        description: 'Owned folder list.',
                        schema: ManagementFolderListResponseSchema,
                        example: { items: [MANAGEMENT_API_EXAMPLES.folder] },
                    },
                    '401': {
                        description: 'Missing or invalid API key.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                },
            },
            post: {
                summary: 'Create folder',
                tags: ['Folders'],
                requestBody: ManagementFolderCreateRequestSchema,
                requestExample: MANAGEMENT_API_EXAMPLES.createFolderRequest,
                requiresAuth: true,
                responses: {
                    '201': {
                        description: 'Created folder.',
                        schema: ManagementFolderMutationResponseSchema,
                        example: { folder: MANAGEMENT_API_EXAMPLES.folder },
                    },
                    '400': {
                        description: 'Invalid payload.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                    '401': {
                        description: 'Missing or invalid API key.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                },
            },
        },
        '/api/v1/folders/{folderId}': {
            patch: {
                summary: 'Update folder',
                tags: ['Folders'],
                pathParams: ManagementFolderPathParamsOpenApiSchema,
                requestBody: ManagementFolderUpdateRequestOpenApiSchema,
                requestExample: MANAGEMENT_API_EXAMPLES.updateFolderRequest,
                requiresAuth: true,
                responses: {
                    '200': {
                        description: 'Updated folder.',
                        schema: ManagementFolderMutationResponseSchema,
                        example: { folder: MANAGEMENT_API_EXAMPLES.folder },
                    },
                    '400': {
                        description: 'Invalid payload.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                    '401': {
                        description: 'Missing or invalid API key.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                    '404': {
                        description: 'Folder not found.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                },
            },
            delete: {
                summary: 'Delete folder',
                tags: ['Folders'],
                pathParams: ManagementFolderPathParamsOpenApiSchema,
                requiresAuth: true,
                responses: {
                    '200': {
                        description: 'Deletion confirmation.',
                        schema: ManagementDeletionResponseSchema,
                        example: { success: true },
                    },
                    '401': {
                        description: 'Missing or invalid API key.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                    '404': {
                        description: 'Folder not found.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                },
            },
        },
        '/api/v1/folders/{folderId}/agents/{agentId}': {
            post: {
                summary: 'Move agent into folder',
                tags: ['Folders'],
                pathParams: ManagementFolderAgentPathParamsOpenApiSchema,
                requiresAuth: true,
                responses: {
                    '200': {
                        description: 'Moved agent summary.',
                        schema: ManagementFolderMoveAgentResponseSchema,
                        example: { agent: MANAGEMENT_API_EXAMPLES.agentSummary },
                    },
                    '401': {
                        description: 'Missing or invalid API key.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                    '404': {
                        description: 'Folder or agent not found.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                },
            },
        },
        '/api/v1/me': {
            get: {
                summary: 'Get API-key identity',
                tags: ['Identity'],
                requiresAuth: true,
                responses: {
                    '200': {
                        description: 'Identity derived from the API key.',
                        schema: ManagementMeResponseSchema,
                        example: MANAGEMENT_API_EXAMPLES.me,
                    },
                    '401': {
                        description: 'Missing or invalid API key.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                },
            },
        },
        '/api/v1/instance': {
            get: {
                summary: 'Get instance metadata',
                tags: ['Instance'],
                requiresAuth: true,
                responses: {
                    '200': {
                        description: 'Runtime instance metadata.',
                        schema: ManagementInstanceResponseSchema,
                        example: MANAGEMENT_API_EXAMPLES.instance,
                    },
                    '401': {
                        description: 'Missing or invalid API key.',
                        schema: ManagementErrorEnvelopeSchema,
                        example: MANAGEMENT_API_EXAMPLES.error,
                    },
                },
            },
        },
    };

/**
 * Generates the OpenAPI 3.1 document for the management API.
 *
 * @param baseUrl - Public base URL of the current Agents Server instance.
 * @returns OpenAPI document rendered from the shared route registry.
 */
export function createManagementOpenApiDocument(baseUrl: string) {
    return {
        openapi: '3.1.0',
        jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
        info: {
            title: 'Promptbook Agents Server Management API',
            version: '1.0.0',
            description:
                'Management API for listing, creating, organizing, updating, and deleting agents and folders on this Agents Server instance.',
        },
        servers: [
            {
                url: baseUrl,
                description: 'Current Agents Server instance',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'API Key',
                    description: 'Use an Agents Server API key in the form `Authorization: Bearer ptbk_...`.',
                },
            },
        },
        tags: [
            { name: 'Agents', description: 'CRUD and listing operations for owned agents.' },
            { name: 'Folders', description: 'Organization operations for owned folders.' },
            { name: 'Identity', description: 'Identity derived from the current API key.' },
            { name: 'Instance', description: 'Static runtime metadata for the current instance.' },
        ],
        paths: Object.fromEntries(
            Object.entries(MANAGEMENT_OPENAPI_ROUTES).map(([path, methods]) => [
                path,
                Object.fromEntries(
                    Object.entries(methods).map(([method, definition]) => [
                        method,
                        createOpenApiOperation(definition as ManagementOpenApiOperationDefinition),
                    ]),
                ),
            ]),
        ),
    };
}

/**
 * Converts one route definition into an OpenAPI operation object.
 *
 * @param definition - Shared route definition.
 * @returns OpenAPI operation object.
 */
function createOpenApiOperation(definition: ManagementOpenApiOperationDefinition) {
    const parameters = [
        ...createOpenApiParameters(definition.pathParams, 'path'),
        ...createOpenApiParameters(definition.query, 'query'),
    ];

    return {
        summary: definition.summary,
        ...(definition.description ? { description: definition.description } : {}),
        tags: definition.tags,
        ...(parameters.length > 0 ? { parameters } : {}),
        ...(definition.requestBody
            ? {
                  requestBody: {
                      required: true,
                      content: {
                          'application/json': {
                              schema: z.toJSONSchema(definition.requestBody),
                              ...(definition.requestExample ? { example: definition.requestExample } : {}),
                          },
                      },
                  },
              }
            : {}),
        ...(definition.requiresAuth ? { security: [{ bearerAuth: [] }] } : {}),
        responses: Object.fromEntries(
            Object.entries(definition.responses).map(([statusCode, responseDefinition]) => [
                statusCode,
                {
                    description: responseDefinition.description,
                    content: {
                        'application/json': {
                            schema: z.toJSONSchema(responseDefinition.schema),
                            ...(responseDefinition.example === undefined
                                ? {}
                                : { example: responseDefinition.example }),
                        },
                    },
                },
            ]),
        ),
    };
}

/**
 * Converts a Zod object schema into OpenAPI parameter definitions.
 *
 * @param schema - Path or query schema.
 * @param location - OpenAPI parameter location.
 * @returns Generated parameter definitions.
 */
function createOpenApiParameters(schema: ManagementOpenApiObjectSchema | undefined, location: 'path' | 'query') {
    if (!schema) {
        return [];
    }

    const jsonSchema = z.toJSONSchema(schema) as {
        properties?: Record<string, unknown>;
        required?: string[];
    };
    const properties = jsonSchema.properties || {};
    const required = new Set(jsonSchema.required || []);

    return Object.entries(properties).map(([parameterName, parameterSchema]) => ({
        name: parameterName,
        in: location,
        required: location === 'path' ? true : required.has(parameterName),
        schema: parameterSchema,
    }));
}
