/**
 * Converts a file path to POSIX format.
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
