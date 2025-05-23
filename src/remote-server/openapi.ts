// TODO: [🥺] List running services from REMOTE_SERVER_URLS
// TODO: [🥺] Import directly from YML

/**
 * @private [🥺] Decide how to expose this
 */
export const openapiJson = {
    openapi: '3.0.0',
    info: {
        title: 'Promptbook Remote Server API ([🥺] From YML)',
        version: '1.0.0',
        description: 'API documentation for the Promptbook Remote Server',
    },
    paths: {
        '/': {
            get: {
                summary: 'Get server details',
                description: 'Returns details about the Promptbook server.',
                responses: {
                    '200': {
                        description: 'Server details in markdown format.',
                        content: {
                            'text/markdown': {
                                schema: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
        },
        '/login': {
            post: {
                summary: 'Login to the server',
                description: 'Login to the server and get identification.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    username: {
                                        type: 'string',
                                    },
                                    password: {
                                        type: 'string',
                                    },
                                    appId: {
                                        type: 'string',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'Successful login',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        isSuccess: {
                                            type: 'boolean',
                                        },
                                        message: {
                                            type: 'string',
                                        },
                                        error: {
                                            type: 'object',
                                        },
                                        identification: {
                                            type: 'object',
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Bad request or login failed',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        error: {
                                            type: 'object',
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '401': {
                        description: 'Authentication error',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        isSuccess: {
                                            type: 'boolean',
                                            enum: [false],
                                        },
                                        message: {
                                            type: 'string',
                                        },
                                        error: {
                                            type: 'object',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/books': {
            get: {
                summary: 'List all books',
                description: 'Returns a list of all available books in the collection.',
                responses: {
                    '200': {
                        description: 'A list of books.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        type: 'string',
                                    },
                                },
                            },
                        },
                    },
                    '500': {
                        description: 'No collection available',
                        content: {
                            'text/plain': {
                                schema: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
        },
        '/books/{bookId}': {
            get: {
                summary: 'Get book content',
                description: 'Returns the content of a specific book.',
                parameters: [
                    {
                        in: 'path',
                        name: 'bookId',
                        required: true,
                        schema: {
                            type: 'string',
                        },
                        description: 'The ID of the book to retrieve.',
                    },
                ],
                responses: {
                    '200': {
                        description: 'The content of the book.',
                        content: {
                            'text/markdown': {
                                schema: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Book not found.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        error: {
                                            type: 'object',
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '500': {
                        description: 'No collection available',
                        content: {
                            'text/plain': {
                                schema: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
        },
        '/executions': {
            get: {
                summary: 'List all executions',
                description: 'Returns a list of all running execution tasks.',
                responses: {
                    '200': {
                        description: 'A list of execution tasks.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            nonce: {
                                                type: 'string',
                                            },
                                            taskId: {
                                                type: 'string',
                                            },
                                            taskType: {
                                                type: 'string',
                                            },
                                            status: {
                                                type: 'string',
                                            },
                                            createdAt: {
                                                type: 'string',
                                                format: 'date-time',
                                            },
                                            updatedAt: {
                                                type: 'string',
                                                format: 'date-time',
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/executions/last': {
            get: {
                summary: 'Get the last execution',
                description: 'Returns details of the last execution task.',
                responses: {
                    '200': {
                        description: 'The last execution task with full details.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        nonce: {
                                            type: 'string',
                                        },
                                        taskId: {
                                            type: 'string',
                                        },
                                        taskType: {
                                            type: 'string',
                                        },
                                        status: {
                                            type: 'string',
                                        },
                                        errors: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                            },
                                        },
                                        warnings: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                            },
                                        },
                                        createdAt: {
                                            type: 'string',
                                            format: 'date-time',
                                        },
                                        updatedAt: {
                                            type: 'string',
                                            format: 'date-time',
                                        },
                                        currentValue: {
                                            type: 'object',
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'No execution tasks found.',
                        content: {
                            'text/plain': {
                                schema: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
        },
        '/executions/{taskId}': {
            get: {
                summary: 'Get specific execution',
                description: 'Returns details of a specific execution task.',
                parameters: [
                    {
                        in: 'path',
                        name: 'taskId',
                        required: true,
                        schema: {
                            type: 'string',
                        },
                        description: 'The ID of the execution task to retrieve.',
                    },
                ],
                responses: {
                    '200': {
                        description: 'The execution task with full details.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        nonce: {
                                            type: 'string',
                                        },
                                        taskId: {
                                            type: 'string',
                                        },
                                        taskType: {
                                            type: 'string',
                                        },
                                        status: {
                                            type: 'string',
                                        },
                                        errors: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                            },
                                        },
                                        warnings: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                            },
                                        },
                                        createdAt: {
                                            type: 'string',
                                            format: 'date-time',
                                        },
                                        updatedAt: {
                                            type: 'string',
                                            format: 'date-time',
                                        },
                                        currentValue: {
                                            type: 'object',
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Execution task not found.',
                        content: {
                            'text/plain': {
                                schema: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
        },
        '/executions/new': {
            post: {
                summary: 'Start a new execution',
                description: 'Starts a new execution task for a given pipeline.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    pipelineUrl: {
                                        type: 'string',
                                        description: 'URL of the pipeline to execute',
                                    },
                                    book: {
                                        type: 'string',
                                        description: 'Alternative field for pipelineUrl',
                                    },
                                    inputParameters: {
                                        type: 'object',
                                        description: 'Parameters for pipeline execution',
                                    },
                                    identification: {
                                        type: 'object',
                                        description: 'User identification data',
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'The newly created execution task.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                },
                            },
                        },
                    },
                    '400': {
                        description: 'Invalid input.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        error: {
                                            type: 'object',
                                        },
                                    },
                                },
                            },
                        },
                    },
                    '404': {
                        description: 'Pipeline not found.',
                        content: {
                            'text/plain': {
                                schema: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
            },
        },
        '/api-docs': {
            get: {
                summary: 'API documentation UI',
                description: 'Swagger UI for API documentation',
                responses: {
                    '200': {
                        description: 'HTML Swagger UI',
                    },
                },
            },
        },
        '/swagger': {
            get: {
                summary: 'API documentation UI (alternative path)',
                description: 'Swagger UI for API documentation',
                responses: {
                    '200': {
                        description: 'HTML Swagger UI',
                    },
                },
            },
        },
        '/openapi': {
            get: {
                summary: 'OpenAPI specification',
                description: 'Returns the OpenAPI JSON specification',
                responses: {
                    '200': {
                        description: 'OpenAPI specification',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    components: {
        schemas: {
            Error: {
                type: 'object',
                properties: {
                    error: {
                        type: 'object',
                    },
                },
            },
            ExecutionTaskSummary: {
                type: 'object',
                properties: {
                    nonce: {
                        type: 'string',
                    },
                    taskId: {
                        type: 'string',
                    },
                    taskType: {
                        type: 'string',
                    },
                    status: {
                        type: 'string',
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                },
            },
            ExecutionTaskFull: {
                type: 'object',
                properties: {
                    nonce: {
                        type: 'string',
                    },
                    taskId: {
                        type: 'string',
                    },
                    taskType: {
                        type: 'string',
                    },
                    status: {
                        type: 'string',
                    },
                    errors: {
                        type: 'array',
                        items: {
                            type: 'object',
                        },
                    },
                    warnings: {
                        type: 'array',
                        items: {
                            type: 'object',
                        },
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                    },
                    currentValue: {
                        type: 'object',
                    },
                },
            },
        },
    },
    tags: [
        {
            name: 'Books',
            description: 'Operations related to books and pipelines',
        },
        {
            name: 'Executions',
            description: 'Operations related to execution tasks',
        },
        {
            name: 'Authentication',
            description: 'Authentication operations',
        },
    ],
};

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */
