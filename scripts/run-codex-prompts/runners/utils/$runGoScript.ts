import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname } from 'path/posix';
import { $execCommand } from '../../../../src/utils/execCommand/$execCommand';

/**
 * Converts a file path to POSIX format
 *
 * @private within the run-codex-prompts script
 * @copy from run-codex-prompts.ts
 */
export function toPosixPath(filePath: string): string {
    if (process.platform === 'win32') {
        const match = filePath.match(/^([a-zA-Z]):\\(.*)$/);
        if (match) {
            return `/${match[1]!.toLowerCase()}/${match[2]!.replace(/\\/g, '/')}`;
        }
    }
    return filePath.replace(/\\/g, '/');
}

type RunGoScriptOptions = {
    /**
     * Path to the temporary script file
     */
    scriptPath: string;

    /**
     * Content of the temporary script file
     */
    scriptContent: string;
};

/**
 * Creates a temporary script file, runs it, and then deletes it
 *
 * @private within the run-codex-prompts script
 */
export async function $runGoScript(options: RunGoScriptOptions): Promise<void> {
    const { scriptPath, scriptContent } = options;

    await mkdir(dirname(scriptPath), { recursive: true });
    await writeFile(scriptPath, scriptContent, 'utf-8');

    try {
        await $execCommand({
            command: `bash "${toPosixPath(scriptPath)}"`,
            isVerbose: true, // <- Note: Proxy the raw command output to the console
        });
    } finally {
        await unlink(scriptPath).catch(() => undefined);
    }
}

/**
 * Creates a temporary script file, runs it, captures output, and then deletes it
 *
 * @private within the run-codex-prompts script
 */
export async function $runGoScriptWithOutput(options: RunGoScriptOptions): Promise<string> {
    const { scriptPath, scriptContent } = options;

    await mkdir(dirname(scriptPath), { recursive: true });
    await writeFile(scriptPath, scriptContent, 'utf-8');

    try {
        const result = await $execCommand({
            command: `bash "${toPosixPath(scriptPath)}"`,
            isVerbose: true, // <- Note: Proxy the raw command output to the console
        });
        return result.stdout;
    } finally {
        await unlink(scriptPath).catch(() => undefined);
    }
}
