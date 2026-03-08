import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import { UseProjectToolNames } from './UseProjectToolNames';

/**
 * Shared repository argument description used in USE PROJECT tool schemas.
 *
 * @private constant of createUseProjectTools
 */
const REPOSITORY_PARAMETER_DESCRIPTION =
    'GitHub repository reference (for example "https://github.com/owner/repo" or "owner/repo").';

/**
 * Adds USE PROJECT tool definitions while keeping already registered tools untouched.
 *
 * @private function of UseProjectCommitmentDefinition
 */
export function createUseProjectTools(existingTools: ReadonlyArray<LlmToolDefinition>): Array<LlmToolDefinition> {
    const updatedTools = [...existingTools];

    const addToolIfMissing = (tool: LlmToolDefinition): void => {
        if (!updatedTools.some((existingTool) => existingTool.name === tool.name)) {
            updatedTools.push(tool);
        }
    };

    addToolIfMissing({
        name: UseProjectToolNames.listFiles,
        description:
            'List files and directories from a configured GitHub repository. Use this first to understand project structure.',
        parameters: {
            type: 'object',
            properties: {
                repository: {
                    type: 'string',
                    description: REPOSITORY_PARAMETER_DESCRIPTION,
                },
                path: {
                    type: 'string',
                    description: 'Directory path in repository (empty means repository root).',
                },
                ref: {
                    type: 'string',
                    description: 'Optional branch, tag, or commit SHA.',
                },
            },
            required: [],
        },
    });

    addToolIfMissing({
        name: UseProjectToolNames.readFile,
        description:
            'Read one text file from a configured GitHub repository. Useful for source analysis and understanding implementation details.',
        parameters: {
            type: 'object',
            properties: {
                repository: {
                    type: 'string',
                    description: REPOSITORY_PARAMETER_DESCRIPTION,
                },
                path: {
                    type: 'string',
                    description: 'File path in repository.',
                },
                ref: {
                    type: 'string',
                    description: 'Optional branch, tag, or commit SHA.',
                },
                startLine: {
                    type: 'integer',
                    description: 'Optional first line number (1-based) for partial reads.',
                },
                endLine: {
                    type: 'integer',
                    description: 'Optional last line number (1-based) for partial reads.',
                },
            },
            required: ['path'],
        },
    });

    addToolIfMissing({
        name: UseProjectToolNames.upsertFile,
        description:
            'Create or update one file in a configured GitHub repository, committing the change directly to target branch.',
        parameters: {
            type: 'object',
            properties: {
                repository: {
                    type: 'string',
                    description: REPOSITORY_PARAMETER_DESCRIPTION,
                },
                path: {
                    type: 'string',
                    description: 'File path to create or update.',
                },
                content: {
                    type: 'string',
                    description: 'Full UTF-8 text content to write.',
                },
                message: {
                    type: 'string',
                    description: 'Commit message for this file change.',
                },
                branch: {
                    type: 'string',
                    description: 'Optional branch name (defaults to repository default branch).',
                },
            },
            required: ['path', 'content', 'message'],
        },
    });

    addToolIfMissing({
        name: UseProjectToolNames.deleteFile,
        description: 'Delete one file from a configured GitHub repository and commit the deletion.',
        parameters: {
            type: 'object',
            properties: {
                repository: {
                    type: 'string',
                    description: REPOSITORY_PARAMETER_DESCRIPTION,
                },
                path: {
                    type: 'string',
                    description: 'File path to delete.',
                },
                message: {
                    type: 'string',
                    description: 'Commit message for deleting the file.',
                },
                branch: {
                    type: 'string',
                    description: 'Optional branch name (defaults to repository default branch).',
                },
            },
            required: ['path', 'message'],
        },
    });

    addToolIfMissing({
        name: UseProjectToolNames.createBranch,
        description: 'Create a new branch in a configured GitHub repository.',
        parameters: {
            type: 'object',
            properties: {
                repository: {
                    type: 'string',
                    description: REPOSITORY_PARAMETER_DESCRIPTION,
                },
                branch: {
                    type: 'string',
                    description: 'Name of the branch to create.',
                },
                fromBranch: {
                    type: 'string',
                    description: 'Source branch (defaults to repository default branch).',
                },
            },
            required: ['branch'],
        },
    });

    addToolIfMissing({
        name: UseProjectToolNames.createPullRequest,
        description: 'Create a pull request in a configured GitHub repository.',
        parameters: {
            type: 'object',
            properties: {
                repository: {
                    type: 'string',
                    description: REPOSITORY_PARAMETER_DESCRIPTION,
                },
                title: {
                    type: 'string',
                    description: 'Pull request title.',
                },
                head: {
                    type: 'string',
                    description: 'Source branch name.',
                },
                base: {
                    type: 'string',
                    description: 'Target branch name (defaults to repository default branch).',
                },
                body: {
                    type: 'string',
                    description: 'Optional pull request body in Markdown.',
                },
                draft: {
                    type: 'boolean',
                    description: 'Whether pull request should be created as draft.',
                },
            },
            required: ['title', 'head'],
        },
    });

    return updatedTools;
}
