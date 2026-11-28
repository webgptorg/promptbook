/**
 * Runs one async callback from a temporary current working directory and always restores the previous directory.
 */
export async function withCurrentWorkingDirectory<T>(directoryPath: string, callback: () => Promise<T>): Promise<T> {
    const previousWorkingDirectory = process.cwd();
    process.chdir(directoryPath);

    try {
        return await callback();
    } finally {
        process.chdir(previousWorkingDirectory);
    }
}
