import { EntityMetadata } from '../utils/findAllProjectEntities';

/**
 * Represents metadata of a package of Promptbook ecosystem
 */
export type PackageMetadata = {
    /**
     * Path to typescript file that is the entry point of the package and re-exports all the entities
     */
    readmeFilePath: string /* <- TODO: More specific */;

    /**
     * Path to typescript file that is the entry point of the package and re-exports all the entities
     */
    entryIndexFilePath: null | string /* <- TODO: More specific */;

    /**
     * Is the package builded
     *
     * - `true` - for packages that contains some source code
     * - `false` - for packages that are just a collection / aliases of other packages
     *             and their only existence reason is to be a shortcut for other packages
     */
    isBuilded: boolean;

    /**
     * Scope of the package
     */
    packageScope: 'promptbook' | null;

    /**
     * Name without scope
     *
     * @example 'ptbk'
     * @example 'utils'
     */
    packageBasename: string /* <- TODO: More specific */;

    /**
     * Name with the scope (if exists)
     *
     * @example 'ptbk'
     * @example '@promptbook/utils'
     */
    packageFullname: string /* <- TODO: More specific */;

    /**
     * List of dependencies for the package
     *
     * Note: If undefined, dependencies are not yet known
     * Note: [🧃] There are only dependencies (not devDependencies) to ensure that everything is always installed
     */
    additionalDependencies: Array<string /* <- TODO: More specific */>;

    /**
     * List of entities which package exports at top level from the `entryIndexFilePath`
     *
     * Note: If undefined, entities are not yet known
     * Note: [🧃] There are only dependencies (not devDependencies) to ensure that everything is always installed
     */
    entities?: Array<EntityMetadata>;
};

/**
 * TODO: Maybe make `PackageMetadata` as discriminated union - isBuilded+entryIndexFilePath
 * Note: [⚫] Code in this file should never be published in any package
 */
