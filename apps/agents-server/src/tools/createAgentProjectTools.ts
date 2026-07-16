import type { LlmToolDefinition } from '../../../../src/types/LlmToolDefinition';
import { AgentProjectToolNames } from './AgentProjectToolNames';

/**
 * Shared project argument description used in local project tool schemas.
 */
const PROJECT_PARAMETER_DESCRIPTION =
    'Project id or exact project name. Optional only when the current agent has exactly one project.';

/**
 * Shared path argument description used in local project tool schemas.
 */
const PROJECT_PATH_PARAMETER_DESCRIPTION = 'Project-relative file or directory path. Do not use absolute paths.';

/**
 * Adds local Agents Server project tool definitions while keeping already registered tools untouched.
 *
 * @param existingTools - Existing tool definitions.
 * @returns Tool definitions including project tools.
 */
export function createAgentProjectTools(
    existingTools: ReadonlyArray<LlmToolDefinition> = [],
): Array<LlmToolDefinition> {
    const tools = [...existingTools];

    const addToolIfMissing = (tool: LlmToolDefinition): void => {
        if (!tools.some((existingTool) => existingTool.name === tool.name)) {
            tools.push(tool);
        }
    };

    addToolIfMissing({
        name: AgentProjectToolNames.listProjects,
        description: 'List local project folders owned by the current agent on this Agents Server.',
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    });

    addToolIfMissing({
        name: AgentProjectToolNames.createProject,
        description:
            'Create a local project folder for the current agent, or return the existing project with that name.',
        parameters: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Human-readable project name.',
                },
            },
            required: ['name'],
        },
    });

    addToolIfMissing({
        name: AgentProjectToolNames.listFiles,
        description: 'List files and directories inside one local project folder.',
        parameters: {
            type: 'object',
            properties: {
                project: {
                    type: 'string',
                    description: PROJECT_PARAMETER_DESCRIPTION,
                },
                path: {
                    type: 'string',
                    description: 'Directory path inside the project. Empty means project root.',
                },
            },
            required: [],
        },
    });

    addToolIfMissing({
        name: AgentProjectToolNames.readFile,
        description: 'Read one text file from a local project folder.',
        parameters: {
            type: 'object',
            properties: {
                project: {
                    type: 'string',
                    description: PROJECT_PARAMETER_DESCRIPTION,
                },
                path: {
                    type: 'string',
                    description: PROJECT_PATH_PARAMETER_DESCRIPTION,
                },
                forceText: {
                    type: 'boolean',
                    description: 'Force best-effort UTF-8 text decoding even when the file looks binary.',
                },
            },
            required: ['path'],
        },
    });

    addToolIfMissing({
        name: AgentProjectToolNames.writeFile,
        description: 'Create or overwrite one UTF-8 text file inside a local project folder.',
        parameters: {
            type: 'object',
            properties: {
                project: {
                    type: 'string',
                    description: PROJECT_PARAMETER_DESCRIPTION,
                },
                path: {
                    type: 'string',
                    description: PROJECT_PATH_PARAMETER_DESCRIPTION,
                },
                content: {
                    type: 'string',
                    description: 'Full UTF-8 text content to write.',
                },
            },
            required: ['path', 'content'],
        },
    });

    addToolIfMissing({
        name: AgentProjectToolNames.deletePath,
        description: 'Delete one file or directory inside a local project folder.',
        parameters: {
            type: 'object',
            properties: {
                project: {
                    type: 'string',
                    description: PROJECT_PARAMETER_DESCRIPTION,
                },
                path: {
                    type: 'string',
                    description: PROJECT_PATH_PARAMETER_DESCRIPTION,
                },
            },
            required: ['path'],
        },
    });

    addToolIfMissing({
        name: AgentProjectToolNames.runScript,
        description: 'Run a batch, shell, or PowerShell script stored inside a local project folder.',
        parameters: {
            type: 'object',
            properties: {
                project: {
                    type: 'string',
                    description: PROJECT_PARAMETER_DESCRIPTION,
                },
                path: {
                    type: 'string',
                    description: 'Project-relative script path. Supported extensions: .bat, .cmd, .ps1, .sh.',
                },
                args: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                    description: 'Optional script arguments.',
                },
                timeoutMs: {
                    type: 'integer',
                    description: 'Optional timeout in milliseconds. Maximum 60000.',
                },
            },
            required: ['path'],
        },
    });

    addToolIfMissing({
        name: AgentProjectToolNames.git,
        description:
            'Run one git command inside a local project folder, so the project can become and stay a git repository. Example args: ["init"], ["status"], ["add", "."], ["commit", "-m", "message"].',
        parameters: {
            type: 'object',
            properties: {
                project: {
                    type: 'string',
                    description: PROJECT_PARAMETER_DESCRIPTION,
                },
                args: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                    description: 'Git command arguments without the leading `git`.',
                },
                timeoutMs: {
                    type: 'integer',
                    description: 'Optional timeout in milliseconds. Maximum 60000.',
                },
            },
            required: ['args'],
        },
    });

    addToolIfMissing({
        name: AgentProjectToolNames.linkFile,
        description:
            'Create a URL that can be placed in chat to link either a project overview or one file from a local project.',
        parameters: {
            type: 'object',
            properties: {
                project: {
                    type: 'string',
                    description: PROJECT_PARAMETER_DESCRIPTION,
                },
                path: {
                    type: 'string',
                    description: 'Optional project-relative file path. Omit to link the project overview.',
                },
            },
            required: [],
        },
    });

    return tools;
}
