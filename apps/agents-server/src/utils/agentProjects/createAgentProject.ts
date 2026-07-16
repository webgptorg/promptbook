import { mkdir } from 'node:fs/promises';
import { spaceTrim } from 'spacetrim';
import { ConflictError } from '../../../../../src/errors/ConflictError';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import type { AgentProjectRecord, AgentProjectRow } from './AgentProjectRecord';
import { mapAgentProjectRow } from './mapAgentProjectRow';
import { provideAgentProjectTable } from './provideAgentProjectTable';
import { createAgentProjectDirectoryName, normalizeAgentProjectName } from './resolveAgentProjectDirectory';

/**
 * Options for creating one agent project.
 */
export type CreateAgentProjectOptions = {
    /**
     * Canonical `Agent.permanentId` that owns the project.
     */
    readonly agentPermanentId: string;

    /**
     * User-facing project name.
     */
    readonly name: string;
};

/**
 * Creates one project for an agent, or returns the active project with the same name.
 *
 * @param options - Project creation options.
 * @returns Existing or newly created project.
 */
export async function createAgentProject(options: CreateAgentProjectOptions): Promise<AgentProjectRecord> {
    const projectName = normalizeAgentProjectName(options.name);
    const existingProject = await findExistingActiveAgentProject(options.agentPermanentId, projectName);

    if (existingProject) {
        await mkdir(existingProject.directoryPath, { recursive: true });
        return existingProject;
    }

    const now = new Date().toISOString();
    const projectTable = await provideAgentProjectTable();
    const { data, error } = await projectTable
        .insert({
            agentPermanentId: options.agentPermanentId,
            name: projectName,
            directoryName: createAgentProjectDirectoryName(projectName),
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
        } as never)
        .select('*')
        .single();

    if (error || !data) {
        if (error?.code === '23505' || /unique/i.test(error?.message || '')) {
            throw new ConflictError(
                spaceTrim(`
                    Project \`${projectName}\` already exists for this agent.

                    Use the existing project or choose a different project name.
                `),
            );
        }

        throw new DatabaseError(error?.message || 'Failed to create agent project.');
    }

    const project = mapAgentProjectRow(data as AgentProjectRow);
    await mkdir(project.directoryPath, { recursive: true });
    return project;
}

/**
 * Finds an active project by its exact name.
 *
 * @private function of `createAgentProject`
 */
async function findExistingActiveAgentProject(
    agentPermanentId: string,
    name: string,
): Promise<AgentProjectRecord | null> {
    const projectTable = await provideAgentProjectTable();
    const { data, error } = await projectTable
        .select('*')
        .eq('agentPermanentId', agentPermanentId as never)
        .eq('name', name as never)
        .is('deletedAt', null)
        .maybeSingle();

    if (error) {
        throw new DatabaseError(error.message);
    }

    return data ? mapAgentProjectRow(data as AgentProjectRow) : null;
}
