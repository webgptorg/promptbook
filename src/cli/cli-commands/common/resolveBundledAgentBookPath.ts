import { stat } from 'fs/promises';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { NotFoundError } from '../../../errors/NotFoundError';

/**
 * Locates a bundled agent in either the source checkout or the generated CLI package.
 *
 * @private internal utility of CLI agent initialization
 */
export async function resolveBundledAgentBookPath(relativeFilePath: string): Promise<string> {
    const candidates = [
        join(__dirname, '..', relativeFilePath),
        join(__dirname, '..', '..', '..', '..', relativeFilePath),
    ];

    for (const candidate of candidates) {
        if (
            await stat(candidate).then(
                (entry) => entry.isFile(),
                () => false,
            )
        ) {
            return candidate;
        }
    }

    throw new NotFoundError(
        spaceTrim(
            (block) => `
            Cannot find the bundled agent book \`${relativeFilePath}\`.

            Checked:
            ${block(candidates.map((candidate) => `- \`${candidate}\``).join('\n'))}
        `,
        ),
    );
}
