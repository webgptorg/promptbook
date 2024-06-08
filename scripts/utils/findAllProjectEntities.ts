import { readAllProjectFiles } from './readAllProjectFiles';

/**
 * All possible entity types in javascript and typescript
 */
type IEntityType = 'const' | 'let' | 'class' | 'function' | 'interface' | 'type' /* <- TODO: More */;

/**
 *  Metadata of entity in javascript and typescript
 */
export type IEntity = {
    /**
     * Where is it
     */
    filePath: string;

    /**
     * What is it - type, class, function,...
     */
    type: IEntityType;

    /**
     * Name of the entity
     */
    name: string;

    /**
     * Documentation text
     */
    anotation?: string;

    /**
     * JSDoc tags
     */
    tags: string[];

    /**
     * Is signalized that the entity is just a type not avialable in runtime
     */
    isType: boolean;
    // TODO: Detect other things like abstract, async...
};

export async function findAllProjectEntities(): Promise<IEntity[]> {
    const files = await readAllProjectFiles();

    const entitities: IEntity[] = [];
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
                type: type as IEntityType,
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
