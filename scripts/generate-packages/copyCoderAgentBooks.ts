import { copyFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';

/** Bundled Books used by both local initialization and the published CLI. */
const CODER_AGENT_ASSETS = ['developer.book', 'planner.book', '.core/adam.book'];

/**
 * Copies every initialized Coder role and its shared ancestor into the CLI package's runtime asset layout.
 * @private internal utility of package generation
 */
export async function copyCoderAgentBooks(repositoryPath: string, packagePath: string): Promise<void> {
    for (const asset of CODER_AGENT_ASSETS) {
        const target = join(packagePath, 'agents/default', asset);
        await mkdir(dirname(target), { recursive: true });
        await copyFile(join(repositoryPath, 'agents/default', asset), target);
    }
}
