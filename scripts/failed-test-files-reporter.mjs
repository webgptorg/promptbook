/**
 * Node.js test reporter that writes the path of every test file with a failure, one per line, once.
 *
 * Used next to the human-readable reporter by `run-node-tests.mjs` to retry exactly the failed files.
 */
export default async function* failedTestFilesReporter(source) {
    const reported = new Set();
    for await (const event of source) {
        if (event.type !== 'test:fail') continue;
        // A failure Node cannot attribute to a file is still reported, so it is never mistaken for a pass.
        const file = event.data.file ?? '<unknown>';
        if (reported.has(file)) continue;
        reported.add(file);
        yield `${file}\n`;
    }
}
