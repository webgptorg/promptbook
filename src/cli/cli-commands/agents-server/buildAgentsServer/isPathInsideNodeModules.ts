import { NODE_MODULES_DIRECTORY_NAME } from './NODE_MODULES_DIRECTORY_NAME';

/**
 * Returns true when one path is nested below a `node_modules` segment.
 *
 * @private internal utility of `buildAgentsServer`
 */
export function isPathInsideNodeModules(path: string): boolean {
    return path.split(/[\\/]+/u).includes(NODE_MODULES_DIRECTORY_NAME);
}
