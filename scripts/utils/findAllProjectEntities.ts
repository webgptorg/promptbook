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
    readonly filePath: string;

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
    readonly anotation?: string;

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

export async function findAllProjectEntities(): Promise<EntityMetadata[]> {
    const files = await readAllProjectFiles();

    const entitities: EntityMetadata[] = [];
    for (const file of files) {
        for (const match of file.content.matchAll(
            /(?<anotation>\/\*\*((?!\/\*\*).)*?\*\/\s*)?export(?:\s+declare)?(?:\s+abstract)?(?:\s+async)?(?:\s+(?<type>[a-z]+))(?:\s+(?<name>[a-zA-Z0-9_$]+))/gs,
        )) {
            const { type, name, anotation } = match.groups!;

            const tags = Array.from(anotation?.match(/@([a-zA-Z0-9_-]+)*/g) || []);

            let isType = false;

            if (['type', 'interface', 'enum'].includes(type)) {
                isType = true;
            }

            entitities.push({
                filePath: file.path,
                type: type as EntityType,
                name,
                anotation,
                tags,
                isType,
            });
        }
    }

    //console.log(entitities.map(({ name }) => name));
    //process.exit(0);

    return entitities;
}
