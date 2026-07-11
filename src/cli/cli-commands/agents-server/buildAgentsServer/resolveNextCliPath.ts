import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../../errors/NotAllowed';

/**
 * Resolves the Next CLI module installed alongside the Promptbook CLI.
 *
 * @private internal utility of `buildAgentsServer`
 */
export function resolveNextCliPath(): string {
    try {
        return require.resolve('next/dist/bin/next');
    } catch {
        throw new NotAllowed(
            spaceTrim(`
                Cannot start Agents Server because the \`next\` package is unavailable.

                Reinstall \`ptbk\` so the CLI package contains the Agents Server runtime dependencies.
            `),
        );
    }
}
