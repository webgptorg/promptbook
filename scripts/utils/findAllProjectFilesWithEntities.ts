import { EntityMetadata, findAllProjectEntities } from './findAllProjectEntities';

/**
 * @@@
 */
export async function findAllProjectFilesWithEntities(): Promise<
    ReadonlyArray<{ filename: string; entities: ReadonlyArray<Omit<EntityMetadata, 'filename'>> }>
> {
    const allEntities = await findAllProjectEntities();

    const entitiesByFile: Record<string, Array<EntityMetadata>> = {};

    for (const entity of allEntities) {
        const { filename } = entity;

        if (!entitiesByFile[filename]) {
            entitiesByFile[filename] = [];
        }

        entitiesByFile[filename].push(entity);
    }

    return Object.entries(entitiesByFile).map(([filename, entities]) => ({ filename, entities }));
}

/**
 * Note: [⚫] Code in this file should never be published in any package
 */
