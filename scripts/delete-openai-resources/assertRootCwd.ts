import colors from 'colors';
import { join } from 'path';

/**
 * Absolute path of the repository root.
 * @private constant of DeleteOpenAiResources
 */
const ROOT_DIR = join(__dirname, '../..');

/**
 * Ensures the script is executed from the repository root.
 * @private function of DeleteOpenAiResources
 */
export function assertRootCwd(): void {
    if (process.cwd() !== ROOT_DIR) {
        console.error(colors.red('CWD must be root of the project.'));
        process.exit(1);
    }
}

