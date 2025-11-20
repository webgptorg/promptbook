import { titleToName } from '../../../../../../src/utils/normalization/titleToName';
import hexEncoder from 'crypto-js/enc-hex';
import sha256 from 'crypto-js/sha256';
import type { string_uri } from '../../../../../../src/types/typeAliases';
import { nameToSubfolderPath } from './nameToSubfolderPath';

/**
 * Generates a path for the user content
 */
export function getUserFileCdnKey(file: Buffer, originalFilename: string): string_uri {
    const hash = sha256(hexEncoder.parse(file.toString('hex'))).toString(/* hex */);

    const originalFilenameParts = originalFilename.split('.');
    const extension = originalFilenameParts.pop();
    const name = titleToName(originalFilenameParts.join('.'));

    const filename = name + '.' + extension;
    // <- Note: [⛳️] Preserving original file name

    return `user/files/${nameToSubfolderPath(hash).join('/')}/${filename}`;
}

/**
 * TODO: [🌍] Unite this logic in one place
 * TODO: Way to garbage unused uploaded files
 * TODO: Probably separate util countBufferHash
 */
