import { execCommand } from './execCommand';

/**
 * TODO: Use this OR make commands available in execCommand options
 */
export async function execCommands({
    commands,
    cwd,
    crashOnError,
}: {
    commands: string[];
    cwd: string;
    crashOnError?: boolean;
}) {
    for (const command of commands) {
        await execCommand({ command, cwd, crashOnError });
    }
}
