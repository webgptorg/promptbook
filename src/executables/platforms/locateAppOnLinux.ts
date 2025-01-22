import { $execCommand } from '../../utils/execCommand/$execCommand';
import type { string_executable_path } from '../../types/typeAliases';
import type { LocateAppOptions } from '../locateApp';

/**
 * @@@
 *
 * @private within the repository
 */
export async function locateAppOnLinux({
    linuxWhich,
}: Pick<Required<LocateAppOptions>, 'linuxWhich'>): Promise<string_executable_path | null> {
    try {
        const result = await $execCommand({ crashOnError: true, command: `which ${linuxWhich}` });

        return result.trim();
    } catch (error) {
        if (!(error instanceof Error)) {
            throw error;
        }

        return null;
    }
}

/**
 * TODO: [🧠][♿] Maybe export through `@promptbook/node`
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 */
