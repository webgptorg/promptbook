import { readAllProjectFiles } from './readAllProjectFiles';

/**
 * All possible entity types in javascript and typescript
 */
type EntityType = 'const' | 'let' | 'class' | 'function' | 'interface' | 'type' /* <- TODO: More */;

/**
 *  Metadata of entity in javascript and typescript
 */
export type EntityMetadata = {
    /**
     * Where is it
     */
    readonly filename: string;

    /**
     * What is it - type, class, function,...
     */
    readonly type: EntityType;

    /**
     * Name of the entity
     */
    readonly name: string;

    /**
     * Documentation text
     */
    readonly annotation?: string;

    /**
     * JSDoc tags
     */
    readonly tags: string[];

    /**
     * Is signalized that the entity is just a type not avialable in runtime
     */
    readonly isType: boolean;
    // TODO: Detect other things like abstract, async...
};

/**
 * Scans the project source code to identify and extract metadata about all exported entities
 * i.e. functions, classes, interfaces, and type definitions
 */
export async function findAllProjectEntities(): Promise<ReadonlyArray<EntityMetadata>> {
    const files = await readAllProjectFiles();

    const entitities: Array<EntityMetadata> = [];
    for (const file of files) {
        for (const match of file.content.matchAll(
            /(?<annotation>\/\*\*((?!\/\*\*).)*?\*\/\s*)?export(?:\s+declare)?(?:\s+abstract)?(?:\s+async)?(?:\s+(?<type>[a-z]+))(?:\s+(?<name>[a-zA-Z0-9_$]+))/gs,
        )) {
            const { type, name, annotation } = match.groups!;

            const tags = Array.from(annotation?.match(/@([a-zA-Z0-9_-]+)*/g) || []);

            let isType = false;

            if (['type', 'interface'].includes(type)) {
                isType = true;
            }

            const filename = file.path;

            if (name === '$') {
                // Note: [🍡] This is not a real entity, but an entity enclosed in a string.
                continue;
            }

            if (filename.endsWith('/src/cli/cli-commands/make.ts') && name === 'getPipelineCollection') {
                // Note: [🍡] This is not a real entity, but an entity enclosed in a string.
                continue;
            }

            if (entitities.some((entity) => entity.name === name && entity.filename === filename)) {
                // Note: This is probably overloaded function or interface, so we skip it
                continue;
            }

            entitities.push({
                filename,
                type: type as EntityType,
                name,
                annotation,
                tags,
                isType,
            });
        }
    }

    // Note: Detect entities with duplicate names
    let isDuplicateNameFound = false;
    const reportedEntityNames = new Set<string>();
    for (const entity of entitities) {
            const duplicates = entitities.filter((existingEntity) => existingEntity.name === entity.name && existingEntity.filename !== entity.filename);

        if (duplicates.length > 0) {
            isDuplicateNameFound = true;

            if (reportedEntityNames.has(entity.name)) {
                // Note: Already reported this entity name, so we skip it
                continue;
            }

            reportedEntityNames.add(entity.name);

            console.error(
                `Duplicate entity name "${entity.name}" found in files:\n${[
                    entity.filename,
                    ...duplicates.map((existingEntity) => existingEntity.filename),
                ]
                    .map((filename) => ` - ${filename}`)
                    .join('\n')}`,
            );
        }
    }
    if (isDuplicateNameFound) {
        throw new Error('Duplicate entity names found. Please resolve them before proceeding with the script.');
    }

    //console.log(entitities.map(({ name }) => name));
    //process.exit(0);

    return entitities;
}

/**
 * TODO: [🧠][🍡][💩] Some better (non-hardcoded) way how to filter non-entities looking like entities
 * Note: [⚫] Code in this file should never be published in any package
 */
