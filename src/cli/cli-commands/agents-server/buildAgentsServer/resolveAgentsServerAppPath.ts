import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../../errors/NotAllowed';
import { isAgentsServerAppPath } from './isAgentsServerAppPath';

/**
 * Finds the Agents Server app in a source checkout or generated CLI package.
 *
 * @private internal utility of `buildAgentsServer`
 */
export async function resolveAgentsServerAppPath(): Promise<string> {
    const candidates = [
        join(process.cwd(), 'apps', 'agents-server'),
        join(__dirname, '..', '..', '..', '..', '..', 'apps', 'agents-server'),
        join(__dirname, '..', '..', '..', 'apps', 'agents-server'),
        join(__dirname, '..', '..', 'apps', 'agents-server'),
    ];

    for (const candidate of candidates) {
        if (await isAgentsServerAppPath(candidate)) {
            return candidate;
        }
    }

    throw new NotAllowed(
        spaceTrim(`
            Cannot find the bundled Agents Server app.

            Checked:
            ${candidates.map((candidate) => `- \`${candidate}\``).join('\n')}
        `),
    );
}
