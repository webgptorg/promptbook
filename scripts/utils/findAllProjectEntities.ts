import { readAllProjectFiles } from './readAllProjectFiles';

/**
 * All possible entity types in javascript and typescript
 */
type IEntityType = 'const' | 'let' | 'class' | 'function' | 'interface' | 'type' /* <- TODO: More */;

/**
 *  Metadata of entity in javascript and typescript
 */
export type IEntity = {
    filePath: string;
    type: IEntityType;
    name: string;
    anotation?: string;
    tags: string[];
    // TODO: Detect other things like abstract, async...
};

export async function findAllProjectEntities(): Promise<IEntity[]> {
    const files = await readAllProjectFiles();

    const entitities: IEntity[] = [];
    for (const file of files) {
        for (const match of file.content.matchAll(
            /(?<anotation>\/\*\*((?!\/\*\*).)*?\*\/\s*)?export(?:\s+declare)?(?:\s+abstract)?(?:\s+async)?(?:\s+(?<type>[a-z]+))(?:\s+(?<name>[a-zA-Z0-9_]+))/gs,
        )) {
            const { type, name, anotation } = match.groups!;

            const tags = Array.from(anotation?.match(/@([a-zA-Z0-9_-]+)*/g) || []);

            entitities.push({
                filePath: file.path,
                type: type as IEntityType,
                name,
                anotation,
                tags,
            });
        }
    }

    //console.log(entitities.map(({ name }) => name));
    //process.exit(0);

    return entitities;
}
