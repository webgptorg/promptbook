'use strict';

const { rm } = require('node:fs/promises');
const { join } = require('node:path');

/**
 * Next.js output directories used by normal and end-to-end builds.
 */
const NEXT_DIST_DIRECTORY_NAMES = ['.next', '.next-e2e'];

/**
 * Removes generated Next.js route types so a build cannot type-check stale routes from another output directory.
 */
async function clearNextGeneratedTypes() {
    await Promise.all(
        NEXT_DIST_DIRECTORY_NAMES.map((nextDistDirectoryName) =>
            rm(join(__dirname, '..', nextDistDirectoryName, 'types'), { force: true, recursive: true }),
        ),
    );
}

void clearNextGeneratedTypes().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
