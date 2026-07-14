import { mkdir } from 'node:fs/promises';
import { spaceTrim } from 'spacetrim';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { NotFoundError } from '../../../../../src/errors/NotFoundError';
import { ParseError } from '../../../../../src/errors/ParseError';
import type { AgentProjectRecord, AgentProjectRow } from './AgentProjectRecord';
import { mapAgentProjectRow } from './mapAgentProjectRow';
import { provideAgentProjectTable } from './provideAgentProjectTable';

/**
 * Options for listing agent projects.
 */
export type ListAgentProjectsOptions = {
    /**
     * Optional agent scope.
     */
    readonly agentPermanentId?: string;

    /**
     * Whether soft-deleted projects should be included.
     */
    readonly isDeletedIncluded?: boolean;
};

/**
 * Lists projects, optionally scoped to one agent.
 *
 * @param options - Listing options.
 * @returns Project records sorted by creation time.
 */
export async function listAgentProjects(options: ListAgentProjectsOptions = {}): Promise<Array<AgentProjectRecord>> {
    const projectTable = await provideAgentProjectTable();
    let query = projectTable.select('*').order('createdAt', { ascending: true });

    if (options.agentPermanentId) {
        query = query.eq('agentPermanentId', options.agentPermanentId as never);
    }

    if (options.isDeletedIncluded !== true) {
        query = query.is('deletedAt', null);
    }

    const { data, error } = await query;
    if (error) {
        throw new DatabaseError(error.message);
    }

    return ((data || []) as AgentProjectRow[]).map(mapAgentProjectRow);
}

/**
 * Finds one project by id or name within an agent scope.
 *
 * @param agentPermanentId - Project-owning agent permanent id.
 * @param identifier - Project id or exact name.
 * @returns Matching project or `null`.
 */
export async function findAgentProjectByIdentifier(
    agentPermanentId: string,
    identifier: string | number,
): Promise<AgentProjectRecord | null> {
    const normalizedIdentifier = normalizeAgentProjectIdentifier(identifier);
    const projectTable = await provideAgentProjectTable();
    let query = projectTable
        .select('*')
        .eq('agentPermanentId', agentPermanentId as never)
        .is('deletedAt', null)
        .limit(2);

    query =
        typeof normalizedIdentifier === 'number'
            ? query.eq('id', normalizedIdentifier as never)
            : query.eq('name', normalizedIdentifier as never);

    const { data, error } = await query;
    if (error) {
        throw new DatabaseError(error.message);
    }

    const projects = ((data || []) as AgentProjectRow[]).map(mapAgentProjectRow);
    if (projects.length === 0) {
        return null;
    }

    return projects[0] || null;
}

/**
 * Resolves one project for a tool call.
 *
 * If no identifier is provided and the agent has exactly one project, that project is used.
 *
 * @param agentPermanentId - Project-owning agent permanent id.
 * @param identifier - Project id or exact name.
 * @returns Matching project with an existing directory.
 */
export async function resolveAgentProjectForTool(
    agentPermanentId: string,
    identifier: unknown,
): Promise<AgentProjectRecord> {
    const normalizedIdentifier = normalizeOptionalProjectIdentifier(identifier);
    const project =
        normalizedIdentifier === null
            ? await resolveOnlyAgentProject(agentPermanentId)
            : await findAgentProjectByIdentifier(agentPermanentId, normalizedIdentifier);

    if (!project) {
        throw new NotFoundError(
            spaceTrim(`
                Agent project was not found.

                - Agent: \`${agentPermanentId}\`
                - Project: \`${String(normalizedIdentifier ?? '(not provided)')}\`
            `),
        );
    }

    await mkdir(project.directoryPath, { recursive: true });
    return project;
}

/**
 * Normalizes an optional project identifier accepted by tools.
 *
 * @private function of `resolveAgentProjectForTool`
 */
function normalizeOptionalProjectIdentifier(identifier: unknown): string | number | null {
    if (identifier === undefined || identifier === null || identifier === '') {
        return null;
    }

    return normalizeAgentProjectIdentifier(identifier);
}

/**
 * Normalizes a project id or name.
 *
 * @private function of `findAgentProjectByIdentifier`
 */
function normalizeAgentProjectIdentifier(identifier: string | number | unknown): string | number {
    if (typeof identifier === 'number') {
        if (Number.isInteger(identifier) && identifier > 0) {
            return identifier;
        }

        throw new ParseError('Project id must be a positive integer.');
    }

    if (typeof identifier !== 'string') {
        throw new ParseError('Project identifier must be a project id or exact project name.');
    }

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
        throw new ParseError('Project identifier must not be empty.');
    }

    const numericIdentifier = Number(trimmedIdentifier);
    if (/^\d+$/u.test(trimmedIdentifier) && Number.isInteger(numericIdentifier) && numericIdentifier > 0) {
        return numericIdentifier;
    }

    return trimmedIdentifier;
}

/**
 * Resolves the single active project for an agent.
 *
 * @private function of `resolveAgentProjectForTool`
 */
async function resolveOnlyAgentProject(agentPermanentId: string): Promise<AgentProjectRecord | null> {
    const projects = await listAgentProjects({ agentPermanentId });

    if (projects.length === 1) {
        return projects[0] || null;
    }

    if (projects.length === 0) {
        throw new NotFoundError(
            spaceTrim(`
                This agent does not have any projects yet.

                Create a project first with \`agent_project_create\`.
            `),
        );
    }

    throw new ParseError(
        spaceTrim(`
            Project is ambiguous.

            This agent has multiple projects. Provide the \`project\` argument as a project id or exact project name.
        `),
    );
}
