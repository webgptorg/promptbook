import type fs from 'fs/promises';

/**
 * Container for all the tools needed to manipulate with filesystem
 */
export type FilesystemTools = Pick<typeof fs, 'access' | 'constants' | 'readFile' | 'stat' | 'readdir'>;

/**
 * TODO: Implement destroyable pattern to free resources
 */
