import { z } from 'zod';
import { ManagementApiErrorSchema } from './managementApiResponses';

/**
 * Supported visibility values exposed by the management API.
 */
export const ManagementAgentVisibilitySchema = z.enum(['PRIVATE', 'UNLISTED', 'PUBLIC']);

/**
 * Supported sort modes for the `GET /api/v1/agents` endpoint.
 */
export const ManagementAgentListSortSchema = z.enum([
    'relevance:desc',
    'createdAt:asc',
    'createdAt:desc',
    'updatedAt:asc',
    'updatedAt:desc',
    'name:asc',
    'name:desc',
]);

/**
 * Standardized navigation links returned for one agent.
 */
export const ManagementAgentLinksSchema = z.object({
    profileUrl: z.string().url(),
    chatUrl: z.string().url(),
    integrationUrl: z.string().url(),
});

/**
 * Public subset of an agent profile returned in the management API.
 */
export const ManagementAgentProfileSchema = z
    .object({
        meta: z.record(z.string(), z.unknown()).optional(),
        personaDescription: z.string().optional(),
    })
    .passthrough();

/**
 * Flat agent summary returned in list and mutation responses.
 */
export const ManagementAgentSummarySchema = z.object({
    id: z.string(),
    agentName: z.string(),
    permanentId: z.string(),
    displayName: z.string(),
    description: z.string().nullable(),
    visibility: ManagementAgentVisibilitySchema,
    folderId: z.number().int().nullable(),
    sortOrder: z.number().int(),
    createdAt: z.string(),
    updatedAt: z.string().nullable(),
    links: ManagementAgentLinksSchema,
});

/**
 * Detailed agent payload returned by `GET /api/v1/agents/{agentId}`.
 */
export const ManagementAgentDetailSchema = ManagementAgentSummarySchema.extend({
    source: z.string(),
    profile: ManagementAgentProfileSchema,
});

/**
 * Pagination envelope returned for paged list endpoints.
 */
export const ManagementPaginationSchema = z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
});

/**
 * Response payload returned by `GET /api/v1/agents`.
 */
export const ManagementAgentListResponseSchema = z.object({
    items: z.array(ManagementAgentSummarySchema),
    pagination: ManagementPaginationSchema,
});

/**
 * Request payload used for agent creation.
 */
export const ManagementAgentCreateRequestSchema = z.object({
    source: z.string().min(1).max(120000),
    folderId: z.number().int().nullable().optional(),
    visibility: ManagementAgentVisibilitySchema.optional(),
    sortOrder: z.number().int().optional(),
});

/**
 * Shared shape used by the runtime and OpenAPI agent-update schemas.
 */
const ManagementAgentUpdateRequestShape = {
    name: z.string().min(1).optional(),
    source: z.string().min(1).max(120000).optional(),
    folderId: z.number().int().nullable().optional(),
    visibility: ManagementAgentVisibilitySchema.optional(),
    sortOrder: z.number().int().optional(),
};

/**
 * Runtime request payload used for agent updates.
 */
export const ManagementAgentUpdateRequestSchema = z
    .object(ManagementAgentUpdateRequestShape)
    .refine((value) => Object.keys(value).length > 0, {
        message: 'At least one updatable field must be provided.',
    });

/**
 * Query parameters accepted by `GET /api/v1/agents`.
 */
export const ManagementAgentListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().trim().optional().transform((value) => value || undefined),
    sort: ManagementAgentListSortSchema.default('updatedAt:desc'),
});

/**
 * Documentation-only query schema for `GET /api/v1/agents`.
 */
export const ManagementAgentListQueryOpenApiSchema = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    q: z.string().optional(),
    sort: ManagementAgentListSortSchema.default('updatedAt:desc'),
});

/**
 * Path params accepted by `GET/PATCH/DELETE /api/v1/agents/{agentId}`.
 */
export const ManagementAgentPathParamsSchema = z.object({
    agentId: z.string().min(1),
});

/**
 * Documentation-only request payload used for agent updates.
 */
export const ManagementAgentUpdateRequestOpenApiSchema = z.object(ManagementAgentUpdateRequestShape);

/**
 * Folder payload returned by folder endpoints.
 */
export const ManagementFolderSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    parentId: z.number().int().nullable(),
    sortOrder: z.number().int(),
    icon: z.string().nullable(),
    color: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string().nullable(),
});

/**
 * Response payload returned by `GET /api/v1/folders`.
 */
export const ManagementFolderListResponseSchema = z.object({
    items: z.array(ManagementFolderSchema),
});

/**
 * Request payload used for folder creation.
 */
export const ManagementFolderCreateRequestSchema = z.object({
    name: z.string().min(1),
    parentId: z.number().int().nullable().optional(),
    sortOrder: z.number().int().optional(),
    icon: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
});

/**
 * Shared shape used by the runtime and OpenAPI folder-update schemas.
 */
const ManagementFolderUpdateRequestShape = {
    name: z.string().min(1).optional(),
    parentId: z.number().int().nullable().optional(),
    sortOrder: z.number().int().optional(),
    icon: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
};

/**
 * Runtime request payload used for folder updates.
 */
export const ManagementFolderUpdateRequestSchema = z
    .object(ManagementFolderUpdateRequestShape)
    .refine((value) => Object.keys(value).length > 0, {
        message: 'At least one updatable field must be provided.',
    });

/**
 * Path params accepted by folder-id endpoints.
 */
export const ManagementFolderPathParamsSchema = z.object({
    folderId: z.coerce.number().int().min(1),
});

/**
 * Documentation-only path params accepted by folder-id endpoints.
 */
export const ManagementFolderPathParamsOpenApiSchema = z.object({
    folderId: z.number().int().min(1),
});

/**
 * Path params accepted by the folder move-agent endpoint.
 */
export const ManagementFolderAgentPathParamsSchema = z.object({
    folderId: z.coerce.number().int().min(1),
    agentId: z.string().min(1),
});

/**
 * Documentation-only path params accepted by the folder move-agent endpoint.
 */
export const ManagementFolderAgentPathParamsOpenApiSchema = z.object({
    folderId: z.number().int().min(1),
    agentId: z.string().min(1),
});

/**
 * Documentation-only request payload used for folder updates.
 */
export const ManagementFolderUpdateRequestOpenApiSchema = z.object(ManagementFolderUpdateRequestShape);

/**
 * Response payload returned by folder mutation endpoints.
 */
export const ManagementFolderMutationResponseSchema = z.object({
    folder: ManagementFolderSchema,
});

/**
 * Response payload returned by agent mutation endpoints.
 */
export const ManagementAgentMutationResponseSchema = z.object({
    agent: ManagementAgentDetailSchema,
});

/**
 * Response payload returned by delete endpoints.
 */
export const ManagementDeletionResponseSchema = z.object({
    success: z.literal(true),
});

/**
 * Response payload returned by `POST /api/v1/folders/{folderId}/agents/{agentId}`.
 */
export const ManagementFolderMoveAgentResponseSchema = z.object({
    agent: ManagementAgentSummarySchema,
});

/**
 * User identity payload returned by `GET /api/v1/me`.
 */
export const ManagementMeResponseSchema = z.object({
    userId: z.number().int(),
    username: z.string(),
    email: z.string().email().nullable(),
    plan: z.string().nullable(),
    limits: z.record(z.string(), z.unknown()).nullable(),
    createdAt: z.string(),
    apiKey: z.object({
        id: z.number().int(),
        note: z.string().nullable(),
        createdAt: z.string(),
    }),
});

/**
 * Instance metadata payload returned by `GET /api/v1/instance`.
 */
export const ManagementInstanceResponseSchema = z.object({
    baseUrl: z.string().url(),
    serverName: z.string(),
    serverVersion: z.string(),
    managementApiBasePath: z.literal('/api/v1'),
    openApiUrl: z.string().url(),
    swaggerUrl: z.string().url(),
    supportedFeatures: z.array(z.string()),
});

/**
 * Shared successful response examples used in OpenAPI generation.
 */
export const MANAGEMENT_API_EXAMPLES = {
    agentSummary: {
        id: 'Ar6LPaP9H8Y4Q2',
        agentName: 'support-concierge',
        permanentId: 'Ar6LPaP9H8Y4Q2',
        displayName: 'Support Concierge',
        description: 'Answers customer support questions and escalates edge cases.',
        visibility: 'UNLISTED',
        folderId: 12,
        sortOrder: 1000,
        createdAt: '2026-03-11T18:04:31.000Z',
        updatedAt: '2026-03-11T18:05:12.000Z',
        links: {
            profileUrl: 'https://agents.example.com/agents/Ar6LPaP9H8Y4Q2',
            chatUrl: 'https://agents.example.com/agents/Ar6LPaP9H8Y4Q2/chat',
            integrationUrl: 'https://agents.example.com/agents/Ar6LPaP9H8Y4Q2/integration',
        },
    },
    agentDetail: {
        id: 'Ar6LPaP9H8Y4Q2',
        agentName: 'support-concierge',
        permanentId: 'Ar6LPaP9H8Y4Q2',
        displayName: 'Support Concierge',
        description: 'Answers customer support questions and escalates edge cases.',
        visibility: 'UNLISTED',
        folderId: 12,
        sortOrder: 1000,
        createdAt: '2026-03-11T18:04:31.000Z',
        updatedAt: '2026-03-11T18:05:12.000Z',
        links: {
            profileUrl: 'https://agents.example.com/agents/Ar6LPaP9H8Y4Q2',
            chatUrl: 'https://agents.example.com/agents/Ar6LPaP9H8Y4Q2/chat',
            integrationUrl: 'https://agents.example.com/agents/Ar6LPaP9H8Y4Q2/integration',
        },
        source: 'Support Concierge\nPERSONA You triage support tickets.\nRULE Escalate billing issues.',
        profile: {
            meta: {
                fullname: 'Support Concierge',
                description: 'Answers customer support questions and escalates edge cases.',
            },
            personaDescription: 'You triage support tickets.',
        },
    },
    createAgentRequest: {
        source: 'Support Concierge\nPERSONA You triage support tickets.\nRULE Escalate billing issues.',
        folderId: 12,
        visibility: 'UNLISTED',
    },
    updateAgentRequest: {
        name: 'Support Concierge v2',
        visibility: 'PUBLIC',
    },
    agentListResponse: {
        items: [],
        pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
        },
    },
    folder: {
        id: 12,
        name: 'Support',
        parentId: null,
        sortOrder: 1000,
        icon: 'folder',
        color: '#1d4ed8',
        createdAt: '2026-03-11T18:04:31.000Z',
        updatedAt: '2026-03-11T18:05:12.000Z',
    },
    createFolderRequest: {
        name: 'Support',
        icon: 'folder',
        color: '#1d4ed8',
    },
    updateFolderRequest: {
        name: 'Support Team',
        color: '#0f766e',
    },
    me: {
        userId: 1,
        username: 'admin',
        email: null,
        plan: null,
        limits: null,
        createdAt: '2026-03-01T00:00:00.000Z',
        apiKey: {
            id: 7,
            note: 'Swagger UI',
            createdAt: '2026-03-11T17:59:18.000Z',
        },
    },
    instance: {
        baseUrl: 'https://agents.example.com',
        serverName: 'Promptbook Agents Server',
        serverVersion: '0.111.0-12',
        managementApiBasePath: '/api/v1',
        openApiUrl: 'https://agents.example.com/openapi.json',
        swaggerUrl: 'https://agents.example.com/swagger',
        supportedFeatures: ['management-api-v1', 'agent-folders', 'swagger-ui', 'openai-compatible-chat'],
    },
    error: {
        error: {
            code: 'not_found',
            message: 'Agent was not found.',
            requestId: '2fef5a3f-4d9e-4f76-9e84-0ffb7f0e1c3d',
        },
    },
} as const;

/**
 * Shared error envelope schema used in OpenAPI responses.
 */
export const ManagementErrorEnvelopeSchema = z.object({
    error: ManagementApiErrorSchema,
});
