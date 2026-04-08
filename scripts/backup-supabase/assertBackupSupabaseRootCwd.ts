import colors from 'colors';
import { join } from 'path';
import { spaceTrim } from '../../src/utils/organization/spaceTrim';

/**
 * Absolute path of the repository root used by the backup script.
 *
 * @private constant of backupSupabase
 */
const BACKUP_SUPABASE_ROOT_DIRECTORY = join(__dirname, '../..');

/**
 * Ensures the backup script is executed from the repository root.
 *
 * @param scriptName Name of the entry script shown in the error output.
 *
 * @private function of backupSupabase
 */
export function assertBackupSupabaseRootCwd(scriptName: string): void {
    if (process.cwd() !== BACKUP_SUPABASE_ROOT_DIRECTORY) {
        console.error(
            colors.red(
                spaceTrim(`
                    CWD must be root of the project

                    Script: ${scriptName}
                    Current CWD: ${process.cwd()}
                    Expected CWD: ${BACKUP_SUPABASE_ROOT_DIRECTORY}
                `),
            ),
        );
        process.exit(1);
    }
}
