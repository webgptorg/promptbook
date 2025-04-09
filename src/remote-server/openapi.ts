// TODO: !!! List running services from REMOTE_SERVER_URLS
// TODO: !!! Import directly from YML
export const openapiJson = {
    openapi: '3.0.0',
    info: {
        title: 'Promptbook Remote Server API (!!! From TS)',
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
                    '200': {
                        description: 'Successful login',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        identification: {
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
                                    },
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
                                    },
                                    inputParameters: {
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
                    },
                },
            },
        },
    },
    components: {},
    tags: [],
};
